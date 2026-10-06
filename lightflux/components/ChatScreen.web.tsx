import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, memo, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useWindowDimensions } from 'react-native';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { chatContent, chatErrorText } from '../content/chat';
import { chatErrorCode } from '../services/chatTransport';
import { flushChatState, useChatStore } from '../store/chatStore';
import { useTodoStore } from '../store/todoStore';
import { useAppShell } from './appShellContext';
import ChatModelConfig from './ChatModelConfig';
import ChatToolCard from './ChatToolCard';
import { chatStyles } from './chatStyles';
import { useConfirmation } from './ui/ConfirmationProvider';
import MenuItem from './ui/MenuItem';
import MenuSurface, { MenuSurfacePosition } from './ui/MenuSurface';

type ConversationControlSource = 'header' | 'history';
type RenameState = { conversationId: string; source: ConversationControlSource };
type ConversationMenuState = RenameState & { position: MenuSurfacePosition };

const CONVERSATION_MENU_WIDTH = 196;

const Icon = ({
  color = 'currentColor',
  name,
  size = 18,
}: {
  color?: string;
  name: ComponentProps<typeof Ionicons>['name'];
  size?: number;
}) => (
  <span aria-hidden="true" style={{ display: 'inline-flex' }}>
    <Ionicons name={name} size={size} color={color} />
  </span>
);

const Markdown = memo(({ text }: { text: string }) => (
  <div className="lf-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      disallowedElements={['img']}
      components={{
        a: ({ children, href }) => /^https?:\/\//i.test(href ?? '')
          ? <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
          : <span>{children}</span>,
      }}
    >{text}</ReactMarkdown>
  </div>
));

export default function ChatScreen() {
  const language = useTodoStore((s) => s.language);
  const t = chatContent[language];
  const shell = useAppShell();
  const confirm = useConfirmation();
  const store = useChatStore();
  const { width } = useWindowDimensions();
  const narrow = width <= 880;
  const [historyOpen, setHistoryOpen] = useState(!narrow);
  const [renaming, setRenaming] = useState<RenameState | null>(null);
  const [renamingSaving, setRenamingSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [conversationMenu, setConversationMenu] = useState<ConversationMenuState | null>(null);
  const [creating, setCreating] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const menuContent = useRef<HTMLDivElement>(null);
  const menuReturnFocus = useRef<HTMLElement | null>(null);
  const follow = useRef(true);
  const sending = useRef(false);
  const conversation = store.data.conversations.find((c) => c.id === store.data.activeId);
  const draftId = conversation?.id ?? 'new';
  const draft = store.drafts[draftId] ?? '';
  const busyHere = !!conversation && store.busyId === conversation.id;
  const blocked = !store.hydrated || !!store.loadError;

  useEffect(() => { void store.hydrate(); }, [store.hydrate]);
  useEffect(() => { setHistoryOpen(!narrow); }, [narrow]);
  useEffect(() => {
    setRenaming(null);
    setConversationMenu(null);
    menuReturnFocus.current = null;
    follow.current = true;
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [conversation?.id]);
  useEffect(() => {
    if (!conversationMenu) return undefined;
    const frame = requestAnimationFrame(() => {
      menuContent.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [conversationMenu]);
  useEffect(() => {
    if (!scroll.current) return;
    if (configOpen) scroll.current.scrollTop = 0;
    else if (follow.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [conversation?.messages, configOpen]);
  useEffect(() => {
    if (input.current) {
      input.current.style.height = 'auto';
      input.current.style.height = `${Math.min(input.current.scrollHeight, 160)}px`;
    }
  }, [draft, configOpen]);

  const report = (error: unknown) => shell.notify(chatErrorText(chatErrorCode(error), language), 'error');
  const act = (promise: Promise<unknown>) => { void promise.catch(report); };
  const closeConversationMenu = (restoreFocus = true) => {
    const target = menuReturnFocus.current;
    menuReturnFocus.current = null;
    setConversationMenu(null);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        if (target?.isConnected) target.focus();
      });
    }
  };
  const showConversationMenu = (
    conversationId: string,
    source: ConversationControlSource,
    position: MenuSurfacePosition,
    returnFocus: HTMLElement | null,
  ) => {
    setRenaming(null);
    menuReturnFocus.current = returnFocus;
    setConversationMenu({ conversationId, source, position });
  };
  const showConversationMenuFromButton = (
    conversationId: string,
    source: ConversationControlSource,
    button: HTMLElement,
  ) => {
    const rect = button.getBoundingClientRect();
    showConversationMenu(
      conversationId,
      source,
      { x: rect.right - CONVERSATION_MENU_WIDTH, y: rect.bottom + 6 },
      button,
    );
  };
  const showConversationMenuFromContext = (
    conversationId: string,
    event: ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (renaming?.conversationId === conversationId) return;
    event.preventDefault();
    event.stopPropagation();
    const selection = event.currentTarget.querySelector<HTMLElement>('[data-chat-control="history"]');
    showConversationMenu(
      conversationId,
      'history',
      { x: event.clientX, y: event.clientY },
      selection,
    );
  };
  const showConversationMenuFromKeyboard = (
    conversationId: string,
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu')) return;
    event.preventDefault();
    event.stopPropagation();
    showConversationMenuFromButton(conversationId, 'history', event.currentTarget);
  };
  const focusConversationControl = (state: RenameState) => {
    requestAnimationFrame(() => {
      const control = Array.from(document.querySelectorAll<HTMLElement>(
        `[data-chat-control="${state.source}"]`,
      )).find((element) => element.dataset.conversationId === state.conversationId);
      control?.focus();
    });
  };
  const cancelRename = () => {
    const previous = renaming;
    setRenaming(null);
    if (previous) focusConversationControl(previous);
  };
  const beginRename = (conversationId: string, source: ConversationControlSource) => {
    const target = store.data.conversations.find((item) => item.id === conversationId);
    if (!target || blocked) return;
    menuReturnFocus.current = null;
    setConversationMenu(null);
    setTitle(target.title);
    setRenaming({ conversationId, source });
  };
  const openConfig = () => {
    setRenaming(null);
    closeConversationMenu(false);
    setConfigOpen(true);
    if (narrow) setHistoryOpen(false);
  };
  const closeConfig = () => {
    setConfigOpen(false);
    requestAnimationFrame(() => input.current?.focus());
  };
  const newChat = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await store.createConversation();
      if (narrow) setHistoryOpen(false);
      closeConfig();
    } catch (error) { report(error); }
    finally { setCreating(false); }
  };
  const send = async () => {
    if (sending.current || store.busyId || !draft.trim() || blocked) return;
    if (!store.hasKey) { openConfig(); return; }
    sending.current = true;
    try {
      const id = conversation?.id ?? await store.createConversation(draft);
      if (!conversation) {
        store.setDraft('new', '');
      }
      follow.current = true;
      await store.send(id, draft, language);
    } catch (error) { report(error); }
    finally { sending.current = false; }
  };
  const rename = async (conversationId: string) => {
    if (renamingSaving) return;
    const previous = renaming;
    setRenamingSaving(true);
    try {
      await store.renameConversation(conversationId, title);
      setRenaming(null);
      if (previous) focusConversationControl(previous);
    } catch (error) { report(error); }
    finally { setRenamingSaving(false); }
  };
  const remove = (conversationId: string) => {
    const target = store.data.conversations.find((item) => item.id === conversationId);
    if (!target || blocked || store.busyId === conversationId) return;
    closeConversationMenu(false);
    confirm({
      title: t.deleteTitle, message: t.deleteHint, cancelText: t.cancel, confirmText: t.delete,
      onConfirm: () => act(store.deleteConversation(conversationId)),
    });
  };
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])',
    ));
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % items.length
      : (current <= 0 ? items.length : current) - 1;
    items[next]?.focus();
  };
  const conversations = [...store.data.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const today = new Date().toDateString();
  const groups = [
    { label: t.today, items: conversations.filter((c) => new Date(c.updatedAt).toDateString() === today) },
    { label: t.earlier, items: conversations.filter((c) => new Date(c.updatedAt).toDateString() !== today) },
  ];
  const menuConversation = conversationMenu
    ? store.data.conversations.find((item) => item.id === conversationMenu.conversationId)
    : undefined;

  return (
    <div className="lf-ai lf-chat" data-history={historyOpen}>
      <style>{chatStyles}</style>
      {historyOpen && (
        <aside className="lf-chat-history" aria-label={t.history}>
          <div className="lf-history-heading">
            <h1>{t.title}</h1>
            <button className="lf-icon" aria-label={t.hideHistory} title={t.hideHistory} onClick={() => setHistoryOpen(false)}>
              <Icon name={narrow ? 'close-outline' : 'chevron-back-outline'} />
            </button>
          </div>
          <button className="lf-new" onClick={() => void newChat()} disabled={blocked || creating}>
            <Icon name="add-outline" />{t.newChat}
          </button>
          <nav className="lf-history-list" aria-label={t.history}>
            {!conversations.length && <div className="lf-history-empty">
              {t.noHistory}<p>{t.noHistoryHint}</p>
            </div>}
            {groups.map((group) => group.items.length > 0 && (
              <div key={group.label}>
                <div className="lf-history-group">{group.label}</div>
                {group.items.map((c) => (
                  <div key={c.id} className="lf-history-row"
                    data-active={c.id === conversation?.id}
                    data-conversation-id={c.id}
                    data-menu-open={conversationMenu?.source === 'history' && conversationMenu.conversationId === c.id}
                    onContextMenu={(event) => showConversationMenuFromContext(c.id, event)}>
                    {renaming?.source === 'history' && renaming.conversationId === c.id ? (
                      <form className="lf-history-rename" onSubmit={(event) => {
                        event.preventDefault();
                        void rename(c.id);
                      }}>
                        <input autoFocus aria-label={t.rename} value={title} maxLength={100}
                          disabled={renamingSaving} onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => setTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              event.stopPropagation();
                              cancelRename();
                            }
                          }} />
                        <button type="submit" className="lf-icon" disabled={renamingSaving || !title.trim()} aria-label={t.save} title={t.save}>
                          <Icon name="checkmark-outline" />
                        </button>
                        <button type="button" className="lf-icon" disabled={renamingSaving} aria-label={t.cancel}
                          title={t.cancel} onClick={cancelRename}>
                          <Icon name="close-outline" />
                        </button>
                      </form>
                    ) : <>
                      <button className="lf-history-select" aria-current={c.id === conversation?.id ? 'page' : undefined}
                        aria-keyshortcuts="Shift+F10" title={c.title || t.untitled}
                        data-chat-control="history" data-conversation-id={c.id}
                        onKeyDown={(event) => showConversationMenuFromKeyboard(c.id, event)}
                        onClick={() => {
                          act(store.selectConversation(c.id));
                          if (narrow) setHistoryOpen(false);
                          closeConfig();
                        }}>
                        <Icon name="chatbubble-outline" />
                        <span className="lf-history-title">{c.title || t.untitled}</span>
                        {store.busyId === c.id && <span className="lf-history-busy" aria-label={t.thinking} title={t.thinking} />}
                      </button>
                      <button className="lf-icon lf-history-more" aria-label={t.menu} title={t.menu}
                        aria-haspopup="menu"
                        aria-expanded={conversationMenu?.source === 'history' && conversationMenu.conversationId === c.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          showConversationMenuFromButton(c.id, 'history', event.currentTarget);
                        }}>
                        <Icon name="ellipsis-horizontal" />
                      </button>
                    </>}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="lf-muted" style={{ padding: '0 8px', fontSize: 10 }}>{t.localHistory}</div>
        </aside>
      )}
      <main className="lf-chat-main" aria-label={t.title} onKeyDown={(e) => {
        if (configOpen && e.key === 'Escape' && !e.defaultPrevented) {
          e.preventDefault(); e.stopPropagation(); closeConfig();
        }
      }}>
        <header className="lf-chat-header">
          {!historyOpen && <button className="lf-icon" aria-label={t.showHistory} title={t.showHistory} onClick={() => setHistoryOpen(true)}><Icon name="albums-outline" /></button>}
          {configOpen ? <>
            <div className="lf-chat-title"><h2>{t.settings}</h2></div>
            <button className="lf-secondary lf-config-back" onClick={closeConfig}><Icon name="arrow-back-outline" />{t.backToChat}</button>
          </> : renaming?.source === 'header' && renaming.conversationId === conversation?.id ? (
            <form className="lf-chat-rename" onSubmit={(event) => {
              event.preventDefault();
              void rename(renaming.conversationId);
            }}>
              <input autoFocus aria-label={t.rename} value={title} maxLength={100} disabled={renamingSaving}
                onFocus={(event) => event.currentTarget.select()} onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    cancelRename();
                  }
                }} />
              <button type="submit" className="lf-icon" disabled={renamingSaving || !title.trim()} aria-label={t.save} title={t.save}><Icon name="checkmark-outline" /></button>
              <button type="button" className="lf-icon" disabled={renamingSaving} aria-label={t.cancel} title={t.cancel} onClick={cancelRename}><Icon name="close-outline" /></button>
            </form>
          ) : <>
            <div className="lf-chat-title">
              <h2>{conversation?.title || t.title}</h2>
              <small>{store.data.config.model}</small>
            </div>
            {conversation && <button className="lf-icon" title={t.menu} aria-label={t.menu}
              aria-haspopup="menu"
              aria-expanded={conversationMenu?.source === 'header' && conversationMenu.conversationId === conversation.id}
              data-chat-control="header" data-conversation-id={conversation.id}
              onClick={(event) => showConversationMenuFromButton(conversation.id, 'header', event.currentTarget)}>
              <Icon name="ellipsis-horizontal" />
            </button>}
            {!historyOpen && <button className="lf-icon" aria-label={t.newChat} title={t.newChat} disabled={blocked || creating} onClick={() => void newChat()}><Icon name="add-outline" /></button>}
          </>}
          {!configOpen && <button className="lf-icon" title={t.settings} aria-label={t.settings} onClick={openConfig}><Icon name="options-outline" /></button>}
        </header>
        {store.saveError && <div className="lf-notice lf-error lf-chat-banner" role="alert">{t.saveError}
          <button onClick={() => act(flushChatState())}>{t.retrySave}</button>
        </div>}
        <div className="lf-chat-scroll" ref={scroll} onScroll={() => {
          const el = scroll.current;
          if (el && !configOpen) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        }}>
          {!store.hydrated ? <div className="lf-chat-welcome" role="status">{t.loading}</div>
            : store.loadError ? <div className="lf-chat-welcome" role="alert"><h2>{t.historyError}</h2><p>{t.historyErrorHint}</p></div>
            : configOpen ? <ChatModelConfig />
            : !conversation?.messages.length ? (
              <div className="lf-chat-welcome">
                <div className="lf-welcome-symbol"><Ionicons name="sparkles-outline" size={32} color="#6759E8" /></div>
                <h2>{t.welcome}</h2>
                <p>{t.welcomeHint}</p>
                {store.hasKey ? (
                  <div className="lf-chat-suggestions">
                    {t.suggestions.map((suggestion) => <button key={suggestion} onClick={() => {
                      store.setDraft(draftId, suggestion); input.current?.focus();
                    }}><Icon name="arrow-forward-outline" />{suggestion}</button>)}
                  </div>
                ) : <div className="lf-chat-setup">
                  <div><strong>{t.setupTitle}</strong><p className="lf-muted">{t.setupHint}</p></div>
                  <button className="lf-primary" onClick={openConfig}>{t.openSettings}<Icon name="arrow-forward-outline" /></button>
                </div>}
              </div>
            ) : (
              <div className="lf-chat-messages">
                {conversation.messages.map((message, index) => (
                  <article className="lf-chat-message" data-role={message.role} key={message.id} aria-label={message.role === 'user' ? t.you : t.assistant}>
                    {message.role === 'user' ? <div className="lf-chat-user-text">{message.content}</div> : <>
                      <div className="lf-chat-message-author"><Icon name="sparkles-outline" />{t.assistant}</div>
                      {message.content ? <Markdown text={message.content} /> : message.status === 'streaming' ? <p className="lf-muted" role="status">{t.thinking}</p> : null}
                      {message.tool && <ChatToolCard tool={message.tool} conversationId={conversation.id} messageId={message.id} language={language} />}
                      {message.status === 'error' && <div className="lf-notice lf-error" role="alert">{chatErrorText(message.error ?? 'network', language)}</div>}
                      {(message.status === 'stopped' || message.status === 'interrupted') && <p className="lf-muted" role="status">{message.status === 'stopped' ? t.stopped : t.interrupted}</p>}
                      {message.status !== 'streaming' && <div className="lf-message-actions">
                        {message.content && <button aria-label={t.copy} onClick={() => {
                          void navigator.clipboard.writeText(message.content).then(() => shell.notify(t.copied)).catch(report);
                        }}><Icon name="copy-outline" />{t.copy}</button>}
                        {index === conversation.messages.length - 1 && message.status !== 'complete' && !message.tool &&
                          <button disabled={!!store.busyId || !store.hasKey} onClick={() => act(store.send(conversation.id, '', language, true))}><Icon name="refresh-outline" />{t.retry}</button>}
                      </div>}
                    </>}
                  </article>
                ))}
              </div>
            )}
        </div>
        {!blocked && !configOpen && <div className="lf-chat-compose-wrap">
          {store.busyId && !busyHere && <div className="lf-notice">{t.generatingElsewhere}<button onClick={store.stop}>{t.stop}</button></div>}
          {!store.hasKey && !!conversation?.messages.length && <div className="lf-notice">{t.setupHint}<button onClick={openConfig}>{t.openSettings}</button></div>}
          <form className="lf-chat-compose" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <textarea ref={input} aria-label={t.placeholder} placeholder={t.placeholder} value={draft}
              rows={2} maxLength={12000} onChange={(e) => store.setDraft(draftId, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault(); void send();
                }
              }} />
            <div className="lf-compose-toolbar">
              <span>{draft.length >= 11800 ? `${draft.length.toLocaleString()} / 12,000` : t.shortcut}</span>
              {busyHere
                ? <button type="button" className="lf-primary" onClick={store.stop} aria-label={t.stop} title={t.stop}><Icon name="stop" /></button>
                : <button className="lf-primary" type="submit" disabled={!draft.trim() || !!store.busyId} aria-label={t.send} title={t.send}><Icon name="arrow-up-outline" /></button>}
            </div>
          </form>
          <div className="lf-compose-footer">{t.scope}</div>
        </div>}
      </main>
      {conversationMenu && menuConversation && (
        <MenuSurface accessibilityLabel={t.menu} closeLabel={t.close} estimatedHeight={108}
          onClose={closeConversationMenu} position={conversationMenu.position} width={CONVERSATION_MENU_WIDTH}>
          <div ref={menuContent} onKeyDown={handleMenuKeyDown}>
            <MenuItem disabled={blocked}
              icon={<Icon name="create-outline" size={17} color="#666778" />}
              label={t.rename}
              onPress={() => beginRename(menuConversation.id, conversationMenu.source)} />
            <MenuItem danger disabled={blocked || store.busyId === menuConversation.id}
              icon={<Icon name="trash-outline" size={17} color="#B44758" />}
              label={t.delete}
              onPress={() => remove(menuConversation.id)} />
          </div>
        </MenuSurface>
      )}
    </div>
  );
}
