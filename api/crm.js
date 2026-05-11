// api/crm.js
// ============================================================
// Pitahaya CRM — Admin Data API
// All routes require a valid Supabase session token.
// Place this file at: /api/crm.js in your Vercel project.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const normalizeSupabaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(?:rest|auth)\/v1$/, "");

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

function setBaseHeaders(req, res) {
  Object.entries(securityHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const origin = req.headers.origin;
  if (!origin) return;

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const sameHost = new URL(origin).host === req.headers.host;
    if (sameHost || origin === configuredOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  } catch {
    // Ignore malformed origins.
  }
}

// ── Auth guard ────────────────────────────────────────────────
async function requireAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  // Only allow specific admin email(s)
  const adminEmails = (process.env.CRM_ADMIN_EMAILS || 'jfmcorp@jfmcorporation.com').split(',').map(e => e.trim());
  if (!adminEmails.includes(user.email)) return null;
  return user;
}

function sanitize(str, maxLen = 500) {
  if (!str) return null;
  return String(str).trim().slice(0, maxLen);
}

// ── Route handlers ────────────────────────────────────────────

async function getLeads(req, res) {
  const { status, priority, service, source_page, search, sort = 'created_at', order = 'desc', limit = 50, offset = 0 } = req.query;

  let query = supabase.from('leads').select('*', { count: 'exact' });

  if (status)      query = query.eq('status', status);
  if (priority)    query = query.eq('priority', priority);
  if (service)     query = query.ilike('service', `%${service}%`);
  if (source_page) query = query.ilike('source_page', `%${source_page}%`);
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  }

  query = query
    .order(sort, { ascending: order === 'asc' })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ leads: data, total: count });
}

async function getLead(req, res, id) {
  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ error: 'Lead no encontrado' });

  const [{ data: notes }, { data: tasks }] = await Promise.all([
    supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('lead_tasks').select('*').eq('lead_id', id).order('due_date', { ascending: true }),
  ]);

  return res.status(200).json({ lead, notes: notes || [], tasks: tasks || [] });
}

async function updateLead(req, res, id) {
  const allowed = ['status','priority','assigned_to','company','phone','service','plan'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = sanitize(req.body[key], 200);
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nada que actualizar' });
  const { error } = await supabase.from('leads').update(updates).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function addNote(req, res, leadId) {
  const content = sanitize(req.body.content, 2000);
  const author  = sanitize(req.body.author, 100) || 'Admin';
  if (!content) return res.status(400).json({ error: 'La nota no puede estar vacía' });
  const { data, error } = await supabase.from('lead_notes').insert({ lead_id: leadId, content, author }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ note: data });
}

async function deleteNote(req, res, noteId) {
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function addTask(req, res, leadId) {
  const title    = sanitize(req.body.title, 300);
  const due_date = req.body.due_date || null;
  if (!title) return res.status(400).json({ error: 'La tarea necesita un título' });
  const { data, error } = await supabase.from('lead_tasks').insert({ lead_id: leadId, title, due_date }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ task: data });
}

async function updateTask(req, res, taskId) {
  const updates = {};
  if (req.body.completed !== undefined) {
    updates.completed = Boolean(req.body.completed);
    updates.completed_at = req.body.completed ? new Date().toISOString() : null;
  }
  if (req.body.title)    updates.title    = sanitize(req.body.title, 300);
  if (req.body.due_date) updates.due_date = req.body.due_date;
  const { error } = await supabase.from('lead_tasks').update(updates).eq('id', taskId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function deleteTask(req, res, taskId) {
  const { error } = await supabase.from('lead_tasks').delete().eq('id', taskId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function getMetrics(req, res) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: total },
    { count: newThisWeek },
    { count: hot },
    { count: won },
    { count: totalClosed },
    { data: byStatus },
    { data: byPriority },
    { data: byService },
    { data: bySource },
    { data: recentLeads },
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('priority', 'hot'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'won'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['won', 'lost']),
    supabase.from('leads').select('status').gte('created_at', monthAgo),
    supabase.from('leads').select('priority').gte('created_at', monthAgo),
    supabase.from('leads').select('service').not('service', 'is', null).gte('created_at', monthAgo),
    supabase.from('leads').select('source_page').not('source_page', 'is', null).gte('created_at', monthAgo),
    supabase.from('leads').select('id,name,email,company,service,status,priority,created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  // Aggregate
  const statusCounts = {};
  (byStatus || []).forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  const priorityCounts = {};
  (byPriority || []).forEach(r => { priorityCounts[r.priority] = (priorityCounts[r.priority] || 0) + 1; });

  const serviceCounts = {};
  (byService || []).forEach(r => {
    if (r.service) serviceCounts[r.service] = (serviceCounts[r.service] || 0) + 1;
  });

  const sourceCounts = {};
  (bySource || []).forEach(r => {
    const page = r.source_page?.split('?')[0]?.split('#')[0] || 'Desconocido';
    sourceCounts[page] = (sourceCounts[page] || 0) + 1;
  });

  const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const conversionRate = totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0;

  return res.status(200).json({
    total,
    newThisWeek,
    hot,
    conversionRate,
    topService,
    statusCounts,
    priorityCounts,
    serviceCounts,
    sourceCounts,
    recentLeads: recentLeads || [],
  });
}

async function exportCSV(req, res) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const headers = ['id','created_at','name','email','phone','company','service','plan','message','source_page','source_demo','status','priority','utm_source','utm_medium','utm_campaign'];
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(','),
    ...(data || []).map(row => headers.map(h => escape(row[h])).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pitahaya-leads-${new Date().toISOString().slice(0,10)}.csv"`);
  return res.status(200).send('\uFEFF' + csv); // BOM for Excel UTF-8
}

// ── Main router ───────────────────────────────────────────────

module.exports = async function handler(req, res) {
  setBaseHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!supabase) {
    return res.status(500).json({ error: 'CRM no configurado. Revisa SUPABASE_URL y SUPABASE_SERVICE_KEY en Vercel.' });
  }

  const user = await requireAuth(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { action, id } = req.query;

  try {
    // GET /api/crm?action=metrics
    if (req.method === 'GET' && action === 'metrics') return getMetrics(req, res);
    // GET /api/crm?action=export
    if (req.method === 'GET' && action === 'export') return exportCSV(req, res);
    // GET /api/crm?action=leads
    if (req.method === 'GET' && action === 'leads') return getLeads(req, res);
    // GET /api/crm?action=lead&id=uuid
    if (req.method === 'GET' && action === 'lead' && id) return getLead(req, res, id);
    // PATCH /api/crm?action=lead&id=uuid
    if (req.method === 'PATCH' && action === 'lead' && id) return updateLead(req, res, id);
    // POST /api/crm?action=note&id=leadUuid
    if (req.method === 'POST' && action === 'note' && id) return addNote(req, res, id);
    // DELETE /api/crm?action=note&id=noteUuid
    if (req.method === 'DELETE' && action === 'note' && id) return deleteNote(req, res, id);
    // POST /api/crm?action=task&id=leadUuid
    if (req.method === 'POST' && action === 'task' && id) return addTask(req, res, id);
    // PATCH /api/crm?action=task&id=taskUuid
    if (req.method === 'PATCH' && action === 'task' && id) return updateTask(req, res, id);
    // DELETE /api/crm?action=task&id=taskUuid
    if (req.method === 'DELETE' && action === 'task' && id) return deleteTask(req, res, id);

    return res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (err) {
    console.error('CRM API error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
