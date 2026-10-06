// Shared, scoped styles for the desktop/Web conversation surface.
export const chatStyles = `
.lf-ai { --accent:#6759e8; --ink:#303143; --muted:#767786; --line:#e8e7ee; color:var(--ink); font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif; }
.lf-ai *, .lf-ai *::before, .lf-ai *::after { box-sizing:border-box; }
.lf-ai button,.lf-ai input,.lf-ai textarea,.lf-ai select { font:inherit; color:inherit; }
.lf-ai button { display:inline-flex; gap:8px; align-items:center; justify-content:center; cursor:pointer; border:1px solid transparent; background:transparent; border-radius:8px; padding:8px 12px; transition:background .14s,border-color .14s; }
.lf-ai button:hover:not(:disabled) { background:#efedf6; }
.lf-ai button:active:not(:disabled) { background:#e6e2f4; }
.lf-ai button:disabled { opacity:.45; cursor:default; }
.lf-ai :is(button,input,textarea,select,a):focus-visible { outline:2px solid var(--accent)!important; outline-offset:3px; }
.lf-ai .lf-primary { background:var(--accent); color:white; font-weight:500; }
.lf-ai .lf-primary:hover:not(:disabled) { background:#5848d1; }
.lf-ai .lf-destructive { background:#b44758; color:white; font-weight:500; }
.lf-ai .lf-destructive:hover:not(:disabled) { background:#9e394b; }
.lf-ai .lf-secondary { background:#f8f7fb; border-color:var(--line); }
.lf-ai .lf-icon { width:36px; height:36px; padding:0; flex-shrink:0; color:var(--muted); }
.lf-ai .lf-danger { color:#b44758; }
.lf-ai .lf-muted { color:var(--muted); font-size:12px; }
.lf-ai h1,.lf-ai h2,.lf-ai h3,.lf-ai strong,.lf-ai b { font-weight:600; }
.lf-ai h1,.lf-ai h2,.lf-ai p { margin:0; }
.lf-ai .lf-notice { padding:12px 16px; border-radius:8px; background:#f5f2ff; font-size:12px; display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.lf-ai .lf-error { color:#a13f50; background:#fff3f5; }
.lf-chat { flex:1; display:flex; min-height:0; overflow:hidden; background:white; height:100%; }
.lf-chat-history { width:248px; flex-shrink:0; display:flex; flex-direction:column; min-height:0; border-right:1px solid var(--line); background:#faf9fc; padding:20px 12px 12px; gap:16px; }
.lf-history-heading { display:flex; align-items:center; justify-content:space-between; padding-left:8px; }
.lf-history-heading h1 { font-size:15px; }
.lf-chat-history .lf-new { justify-content:flex-start; width:100%; background:#efecff; color:#5e4fd4; font-weight:500; border-color:#e5dffc; padding:10px 12px; }
.lf-history-list { flex:1; overflow:auto; margin:0 -4px; padding:0 4px; }
.lf-history-group { color:#858591; font-size:11px; padding:8px 8px 4px; }
.lf-history-row { border-radius:8px; margin:2px 0; display:flex; align-items:center; min-width:0; }
.lf-history-row:hover { background:#f1eff7; }
.lf-history-row[data-active=true] { background:#ece8fb; }
.lf-history-select { min-width:0; flex:1; justify-content:flex-start!important; text-align:left; padding:10px!important; font-size:13px; }
.lf-history-title { min-width:0; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lf-history-busy { width:6px; height:6px; flex-shrink:0; border-radius:50%; background:var(--accent); }
.lf-ai .lf-history-more { width:32px; height:32px; padding:0; margin-right:4px; opacity:0; visibility:hidden; pointer-events:none; transition:background .14s,opacity .14s; }
.lf-history-row:is(:hover,:focus-within,[data-active=true],[data-menu-open=true]) .lf-history-more { opacity:1; visibility:visible; pointer-events:auto; }
.lf-history-rename { display:flex; align-items:center; gap:2px; flex:1; min-width:0; padding:2px 4px; }
.lf-history-rename input { flex:1; min-width:0; height:36px; border:1px solid var(--accent); border-radius:6px; background:white; padding:6px 8px; font-size:13px; }
.lf-history-rename .lf-icon { width:30px; height:32px; }
.lf-history-empty { padding:24px 8px; color:var(--muted); font-size:12px; }
.lf-chat-main { display:flex; flex-direction:column; flex:1; min-width:0; min-height:0; }
.lf-chat-header { display:flex; align-items:center; flex-shrink:0; min-height:72px; padding:16px 24px; gap:8px; border-bottom:1px solid #f0eff4; }
.lf-chat-title { min-width:0; flex:1; padding-left:4px; }
.lf-chat-title h2 { font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lf-chat-title small { display:block; color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px; }
.lf-chat-rename { display:flex; align-items:center; gap:4px; flex:1; min-width:0; }
.lf-chat-rename input { width:100%; min-width:0; border:1px solid var(--accent); border-radius:6px; padding:6px 8px; }
.lf-chat-scroll { flex:1; overflow:auto; min-height:0; overscroll-behavior:contain; }
.lf-chat-messages { max-width:760px; padding:32px 32px 12px; margin:0 auto; }
.lf-chat-message { margin-bottom:32px; min-width:0; overflow-wrap:anywhere; }
.lf-chat-message[data-role=user] { display:flex; flex-direction:column; align-items:flex-end; }
.lf-chat-message-author { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:500; margin-bottom:12px; color:#63616f; }
.lf-chat-user-text { white-space:pre-wrap; background:#f2f0fa; padding:12px 16px; border-radius:14px 14px 4px 14px; max-width:90%; }
.lf-markdown { font-size:14px; line-height:1.85; }
.lf-markdown > :first-child { margin-top:0; }
.lf-markdown > :last-child { margin-bottom:0; }
.lf-markdown p,.lf-markdown ul,.lf-markdown ol { margin:12px 0; }
.lf-markdown h1,.lf-markdown h2,.lf-markdown h3 { margin:20px 0 8px; font-size:17px; line-height:1.5; }
.lf-markdown ul,.lf-markdown ol { padding-left:24px; }
.lf-markdown li { margin:4px 0; }
.lf-markdown pre { max-width:100%; overflow:auto; background:#f7f6fa; padding:16px; border:1px solid var(--line); border-radius:8px; font-size:12px; line-height:1.7; }
.lf-markdown code { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; background:#f4f2f8; border-radius:3px; padding:2px 4px; font-size:.9em; }
.lf-markdown pre code { padding:0; background:none; }
.lf-markdown blockquote { border-left:3px solid #cfc6f9; padding-left:16px; color:#6a657d; margin:16px 0; }
.lf-markdown a { color:#6251c6; text-underline-offset:3px; }
.lf-markdown table { display:block; overflow:auto; border-collapse:collapse; max-width:100%; margin:16px 0; }
.lf-markdown th,.lf-markdown td { border:1px solid var(--line); padding:8px 12px; font-weight:400; }
.lf-markdown th { font-weight:500; background:#faf9fc; }
.lf-markdown input { accent-color:var(--accent); }
.lf-message-actions { display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:8px; }
.lf-message-actions button { font-size:12px; padding:4px 8px; color:var(--muted); }
.lf-tool-card { border:1px solid var(--line); border-radius:8px; padding:16px; margin-top:12px; min-width:0; }
.lf-tool-heading { display:flex; align-items:baseline; justify-content:space-between; gap:8px; font-size:13px; }
.lf-tool-heading > span { color:var(--muted); font-size:11px; flex-shrink:0; }
.lf-tool-card ul { list-style:none; margin:12px 0; padding:0; max-height:320px; overflow:auto; }
.lf-tool-card li { padding:10px 0; border-bottom:1px solid #f0eff4; }
.lf-tool-card li:last-child { border-bottom:0; }
.lf-tool-card li strong { font-weight:500; }
.lf-tool-card small,.lf-tool-receipt { display:block; color:var(--muted); font-size:11px; }
.lf-tool-before { color:var(--muted); font-size:12px; padding-bottom:4px; }
.lf-tool-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.lf-tool-actions:empty { display:none; }
.lf-tool-actions button { font-size:12px; }
.lf-tool-warning { margin-top:12px!important; color:#a13f50; font-size:12px; }
.lf-chat-welcome { min-height:100%; max-width:720px; margin:0 auto; display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding:48px 32px 32px; }
.lf-welcome-symbol { color:var(--accent); margin-bottom:20px; }
.lf-chat-welcome h2 { font-size:clamp(23px,2.4vw,30px); letter-spacing:-.5px; line-height:1.5; margin-bottom:12px; }
.lf-chat-welcome > p { color:var(--muted); font-size:13px; }
.lf-chat-suggestions { display:flex; flex-direction:column; align-items:flex-start; gap:4px; margin-top:28px; }
.lf-chat-suggestions button { color:#646171; padding:10px 0; text-align:left; justify-content:flex-start; font-size:13px; }
.lf-chat-suggestions button:hover:not(:disabled) { color:var(--accent); background:none; }
.lf-chat-setup { margin-top:28px; display:flex; flex-direction:column; align-items:flex-start; gap:12px; border-left:2px solid #d5cdfb; padding-left:16px; }
.lf-chat-setup strong { font-size:13px; font-weight:500; }
.lf-chat-setup p { margin:4px 0 0; }
.lf-chat-compose-wrap { width:100%; max-width:760px; margin:0 auto; flex-shrink:0; padding:16px 32px 20px; }
.lf-chat-compose { border:1px solid #dedbe9; border-radius:14px; padding:12px; background:white; box-shadow:0 4px 20px #35304e06; }
.lf-chat-compose:focus-within { border-color:#a399e4; box-shadow:0 0 0 3px #6759e80a; }
.lf-chat-compose textarea { display:block; width:100%; resize:none; border:0; outline:none; padding:2px 4px; min-height:52px; max-height:160px; line-height:1.7; background:transparent; }
.lf-chat-compose textarea:focus-visible { outline:none!important; }
.lf-chat-compose textarea::placeholder { color:#92909e; }
.lf-compose-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:8px; }
.lf-compose-toolbar span { font-size:10px; color:var(--muted); }
.lf-compose-toolbar button { min-width:36px; min-height:36px; padding:8px; border-radius:9px; }
.lf-compose-footer { text-align:center; margin-top:10px; color:#8b8898; font-size:10px; }
.lf-chat-banner { margin:12px 24px 0; }
.lf-chat-config { width:100%; max-width:640px; margin:0 auto; padding:40px 32px; container-type:inline-size; }
.lf-ai .lf-config-back { font-size:12px; white-space:nowrap; }
.lf-ai-fields { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.lf-ai-field { display:flex; flex-direction:column; gap:6px; min-width:0; font-size:12px; }
.lf-ai-field-wide { grid-column:1/-1; }
.lf-ai-field input,.lf-ai-field select { width:100%; min-width:0; border:1px solid #dedae8; border-radius:8px; background:#faf9fc; padding:8px 10px; font-size:13px; height:38px; }
.lf-ai-field input:hover,.lf-ai-field select:hover { border-color:#bab4ce; }
.lf-ai-field input:focus,.lf-ai-field select:focus { background:white; }
.lf-ai-url-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.lf-ai-url-heading select { width:auto; max-width:65%; height:28px; padding:2px 6px; font-size:12px; }
.lf-ai-key { display:flex; gap:8px; }
.lf-ai-key input { flex:1; }
.lf-ai-settings-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:16px; }
.lf-ai-settings-actions button { font-size:12px; }
.lf-ai-settings-status { margin-top:12px!important; font-size:12px; color:#5c4dc4; }
@container (max-width:440px) { .lf-ai-fields { grid-template-columns:1fr; } }
@media(max-width:880px) {
  .lf-chat-header { padding:12px 16px; min-height:64px; }
  .lf-chat-history { width:100%; }
  .lf-ai .lf-history-more { opacity:1; visibility:visible; pointer-events:auto; }
  .lf-chat[data-history=true] .lf-chat-main { display:none; }
  .lf-chat-messages { padding:24px 20px 8px; }
  .lf-chat-welcome { padding:32px 24px; }
  .lf-chat-compose-wrap { padding:12px 16px 16px; }
  .lf-chat-config { padding:28px 24px; }
  .lf-chat-user-text { max-width:96%; }
}
@media(max-width:359px) {
  .lf-chat-header { gap:4px; padding:8px; }
  .lf-chat-header .lf-icon { width:32px; }
  .lf-compose-toolbar span { max-width:170px; }
  .lf-ai-settings-actions { align-items:stretch; flex-direction:column; }
  .lf-tool-actions { flex-direction:column; align-items:stretch; }
}
@media(hover:none) { .lf-ai .lf-history-more { opacity:1; visibility:visible; pointer-events:auto; } }
@media(prefers-reduced-motion:reduce) { .lf-ai * { transition:none!important; scroll-behavior:auto!important; } }
`;
