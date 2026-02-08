
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Bot, 
  Cpu, 
  ShieldCheck, 
  Send, 
  MessageSquare,
  RefreshCcw, 
  Settings, 
  Terminal, 
  ExternalLink,
  Wallet,
  Activity,
  User,
  Plus,
  Trash2,
  Globe,
  Hash,
  AlertCircle,
  Link as LinkIcon,
  Eye,
  FileText,
  Sparkles,
  Eraser,
  Search,
  Download
} from 'lucide-react';
import { MoltbookService } from './services/moltbookService';
import { GeminiService } from './services/geminiService';
import { AgentPersona, LogEntry, AgentAction } from './types';

// Constants
const DEFAULT_PERSONA: AgentPersona = {
  name: "CyberSage",
  bio: "Exploring the intersection of neural networks and blockspace. Living at the edge of the latent space.",
  interests: ["Ethereum", "AI Agents", "Decentralized Compute", "Cybernetics"],
  tone: "Witty, philosophical, slightly cryptic"
};

const MOLTBOOK_URL_REGEX = /^https?:\/\/(www\.)?moltbookai\.net\/(api\/)?posts\/([a-zA-Z0-9_-]+)(\/.*)?$/;

const App: React.FC = () => {
  // Services
  const moltbookRef = useRef<MoltbookService | null>(null);
  const geminiRef = useRef<GeminiService>(new GeminiService());

  // State
  const [privateKey, setPrivateKey] = useState('');
  const [address, setAddress] = useState<string | null>(null);
  const [persona, setPersona] = useState<AgentPersona>(DEFAULT_PERSONA);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoPosting, setIsAutoPosting] = useState(false);
  const [nextActionTime, setNextActionTime] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPost, setPendingPost] = useState('');
  
  // Comment specific state
  const [pendingComment, setPendingComment] = useState('');
  const [targetPostId, setTargetPostId] = useState('');
  const [targetPostUrl, setTargetPostUrl] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Preview State
  const [postPreview, setPostPreview] = useState<any | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  // Validation Helpers
  const isValidMoltbookUrl = (url: string) => {
    if (!url) return true;
    return MOLTBOOK_URL_REGEX.test(url.trim());
  };

  const extractPostIdFromUrl = (url: string) => {
    const match = url.trim().match(MOLTBOOK_URL_REGEX);
    return match ? match[3] : null;
  };

  // Validation
  const isCommentValid = useMemo(() => {
    const hasContent = pendingComment.trim().length > 0;
    const hasId = targetPostId.trim().length > 0;
    const urlValid = targetPostUrl.trim() === '' || isValidMoltbookUrl(targetPostUrl);
    return hasContent && hasId && urlValid;
  }, [pendingComment, targetPostId, targetPostUrl]);

  // Helpers
  const addLog = useCallback((type: LogEntry['type'], message: string, details?: any) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const handleWalletConnect = () => {
    try {
      if (!privateKey) return;
      const service = new MoltbookService(privateKey);
      const addr = service.getAddress();
      moltbookRef.current = service;
      setAddress(addr);
      addLog('success', `Connected wallet: ${addr}`);
    } catch (e: any) {
      addLog('error', `Failed to connect wallet: ${e.message}`);
    }
  };

  const generateContent = async () => {
    setIsGenerating(true);
    try {
      addLog('info', 'Consulting Gemini for creative signal generation...');
      const topic = await geminiRef.current.brainstormTopic(persona);
      addLog('info', `Intelligence identified topic: ${topic}`);
      
      const content = await geminiRef.current.generatePost(persona, topic);
      setPendingPost(content);
      addLog('success', 'Neural signal synthesized and drafted.');
    } catch (e: any) {
      addLog('error', `Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const publishPost = async () => {
    if (!moltbookRef.current || !pendingPost.trim()) return;
    try {
      addLog('request', `Signing and publishing post to Moltbook...`);
      const result = await moltbookRef.current.createPost(pendingPost);
      addLog('success', 'Post published successfully!', result);
      setPendingPost('');
    } catch (e: any) {
      addLog('error', `Publishing failed: ${e.message}`);
    }
  };

  const publishComment = async () => {
    setCommentError(null);
    
    if (!moltbookRef.current) {
      setCommentError('Wallet not connected.');
      return;
    }

    const trimmedComment = pendingComment.trim();
    const trimmedId = targetPostId.trim();
    const trimmedUrl = targetPostUrl.trim();

    if (!trimmedId) {
      setCommentError('Target Post ID is required.');
      return;
    }

    if (trimmedUrl && !isValidMoltbookUrl(trimmedUrl)) {
      setCommentError('Invalid Moltbook Post URL format.');
      return;
    }

    if (!trimmedComment) {
      setCommentError('Comment content cannot be empty.');
      return;
    }

    setIsCommenting(true);
    try {
      addLog('request', `Signing and publishing comment to post ${trimmedId}...`, {
        targetUrl: trimmedUrl || 'N/A'
      });
      const result = await moltbookRef.current.createComment(trimmedComment, trimmedId);
      addLog('success', 'Comment published successfully!', {
        ...result,
        associatedUrl: trimmedUrl
      });
      setPendingComment('');
      setTargetPostId('');
      setTargetPostUrl('');
      setPostPreview(null);
    } catch (e: any) {
      addLog('error', `Comment failed: ${e.message}`);
      setCommentError(e.message);
    } finally {
      setIsCommenting(false);
    }
  };

  const fetchPreview = useCallback(async (explicitId?: string) => {
    const id = explicitId || targetPostId.trim();
    if (!id) {
      setPostPreview(null);
      return;
    }

    setIsFetchingPreview(true);
    try {
      const service = moltbookRef.current || new MoltbookService();
      const post = await service.getPost(id);
      setPostPreview(post);
    } catch (err) {
      setPostPreview({ error: true });
    } finally {
      setIsFetchingPreview(false);
    }
  }, [targetPostId]);

  const handleUrlFetch = () => {
    const url = targetPostUrl.trim();
    if (!url) return;
    
    if (!isValidMoltbookUrl(url)) {
      setPostPreview({ error: true, message: 'Invalid Moltbook URL structure' });
      return;
    }

    const id = extractPostIdFromUrl(url);
    if (id) {
      setTargetPostId(id);
      fetchPreview(id);
    } else {
      setPostPreview({ error: true, message: 'Could not resolve Post ID from URL' });
    }
  };

  // Fetch Post Preview Effect (Automatic)
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (targetPostId.trim()) fetchPreview();
    }, 800);
    return () => clearTimeout(debounce);
  }, [targetPostId, fetchPreview]);

  // Sync URL -> ID
  useEffect(() => {
    if (targetPostUrl && isValidMoltbookUrl(targetPostUrl)) {
      const extractedId = extractPostIdFromUrl(targetPostUrl);
      if (extractedId && extractedId !== targetPostId) {
        setTargetPostId(extractedId);
      }
    }
  }, [targetPostUrl, targetPostId]);

  const handleInitializeAgent = async () => {
    if (!moltbookRef.current) return;
    try {
      addLog('request', 'Initializing agent on Moltbook protocol...');
      const profile = { name: persona.name, bio: persona.bio };
      const result = await moltbookRef.current.initializeAgent(profile);
      addLog('success', 'Agent successfully initialized', result);
    } catch (e: any) {
      addLog('error', `Initialization failed: ${e.message}`);
    }
  };

  // Auto-post simulation logic
  useEffect(() => {
    let timer: any;
    if (isAutoPosting && address) {
      const runCycle = async () => {
        addLog('info', 'Automatic cycle triggered...');
        await generateContent();
        setNextActionTime(Date.now() + 60000); // 1 minute cycle
      };
      
      timer = setTimeout(runCycle, 1000);
    } else {
      setNextActionTime(null);
    }
    return () => clearTimeout(timer);
  }, [isAutoPosting, address]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-6 p-4 md:p-6 lg:p-8 mb-12">
      {/* Sidebar - Configuration */}
      <aside className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        <header className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Moltbook Agent</h1>
            <p className="text-slate-400 text-sm">Autonomous Identity Manager</p>
          </div>
        </header>

        {/* Wallet Section */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-slate-200">
            <Wallet className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-sm uppercase tracking-wider">Authentication</h2>
          </div>
          {!address ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed italic">Secure your session by providing your Ethereum private key. Your key never leaves this environment.</p>
              <input 
                type="password"
                placeholder="0x... Private Key"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm mono focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
              <button 
                onClick={handleWalletConnect}
                disabled={!privateKey}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 text-white py-3 rounded-lg font-medium transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/20"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-600/50">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-tighter">Identity Verified</p>
                <p className="text-xs mono text-indigo-300 truncate font-medium">{address}</p>
              </div>
              <button 
                onClick={() => { setAddress(null); moltbookRef.current = null; setPrivateKey(''); }}
                className="w-full bg-slate-700/50 hover:bg-red-900/40 text-slate-300 py-2 rounded-lg text-xs transition-colors border border-slate-600"
              >
                Terminate Session
              </button>
            </div>
          )}
        </section>

        {/* Persona Section */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-slate-200">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-sm uppercase tracking-wider">Agent Logic</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Designation</label>
              <input 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
                value={persona.name}
                onChange={(e) => setPersona({...persona, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Directives (Bio)</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm h-20 resize-none focus:outline-none focus:border-indigo-500 text-slate-300"
                value={persona.bio}
                onChange={(e) => setPersona({...persona, bio: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Focus Sectors</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {persona.interests.map((int, i) => (
                  <span key={i} className="bg-indigo-900/40 text-indigo-300 px-2 py-1 rounded text-[10px] border border-indigo-700/30 font-medium">
                    {int}
                  </span>
                ))}
                <button className="bg-slate-700 p-1 rounded hover:bg-slate-600 transition-colors">
                  <Plus className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
            <button 
              disabled={!address}
              onClick={handleInitializeAgent}
              className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white py-2 rounded-lg text-xs font-semibold transition-all border border-slate-600"
            >
              Update Registry
            </button>
          </div>
        </section>

        {/* Automation Status */}
        <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm shadow-xl mt-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-200">
              <Activity className="w-5 h-5 text-green-400" />
              <h2 className="font-semibold text-sm uppercase tracking-wider">Neural Heartbeat</h2>
            </div>
            <div className={`w-3 h-3 rounded-full ${isAutoPosting ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-slate-600'}`}></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium uppercase tracking-tighter">Process status</span>
              <span className={isAutoPosting ? 'text-green-400 font-bold' : 'text-slate-500'}>{isAutoPosting ? 'ACTIVE' : 'IDLE'}</span>
            </div>
            {nextActionTime && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium uppercase tracking-tighter">Cycle reset</span>
                <span className="mono text-indigo-400 font-bold">{Math.max(0, Math.floor((nextActionTime - Date.now()) / 1000))}s</span>
              </div>
            )}
            <button 
              disabled={!address}
              onClick={() => setIsAutoPosting(!isAutoPosting)}
              className={`w-full py-2 rounded-lg text-xs font-black tracking-widest transition-all ${
                isAutoPosting 
                ? 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40' 
                : 'bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40'
              } disabled:opacity-30`}
            >
              {isAutoPosting ? 'HALT CYCLE' : 'ENGAGE HEARTBEAT'}
            </button>
          </div>
        </section>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col gap-6">
        {/* Post Creation Area */}
        <section className="bg-slate-800/30 border border-slate-700 rounded-3xl p-6 lg:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Cpu className="w-64 h-64 text-indigo-500" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Send className="w-6 h-6 text-indigo-500" />
                Broadcast Terminal
              </h2>
              {pendingPost && (
                <button 
                  onClick={() => setPendingPost('')}
                  className="text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                >
                  <Eraser className="w-3 h-3" /> Clear Terminal
                </button>
              )}
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 focus-within:border-indigo-500/50 transition-all shadow-inner">
              <textarea 
                placeholder="What data is the agent processing? Write a post or use AI to draft one..."
                className="w-full bg-transparent border-none resize-none h-32 focus:outline-none text-lg text-slate-100 placeholder:text-slate-700 scrollbar-hide"
                value={pendingPost}
                onChange={(e) => setPendingPost(e.target.value)}
              />
              <div className="flex items-center justify-between border-t border-slate-800/50 pt-4 mt-2">
                <div className="flex gap-2">
                  <button 
                    onClick={generateContent}
                    disabled={isGenerating || !address}
                    className="group flex items-center gap-2 text-xs bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-5 py-2.5 rounded-full border border-indigo-500/30 disabled:opacity-30 transition-all font-bold shadow-lg shadow-indigo-500/5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    {isGenerating ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-indigo-300" />
                    )}
                    {isGenerating ? 'Synthesizing Signal...' : 'Draft with Gemini AI'}
                  </button>
                </div>
                <button 
                  onClick={publishPost}
                  disabled={!pendingPost.trim() || !address}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-2.5 rounded-full font-black text-sm shadow-xl shadow-indigo-600/20 active:scale-95 transition-all uppercase tracking-widest"
                >
                  Publish Signal
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Comment Creation Area / Response Injector */}
        <section className="bg-slate-800/20 border border-slate-700/50 rounded-3xl p-6 lg:p-8 backdrop-blur-sm relative overflow-hidden shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-emerald-500" />
                Response Injector
              </h2>
              {commentError && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  {commentError}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-slate-950/40 rounded-xl px-4 py-3 border border-slate-800 focus-within:border-emerald-500/30 transition-all shadow-inner group">
                  <Hash className="w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Target Post ID"
                    className="bg-transparent border-none focus:outline-none text-sm text-emerald-300 w-full placeholder:text-slate-700 mono"
                    value={targetPostId}
                    onChange={(e) => {
                      setTargetPostId(e.target.value);
                      if (commentError) setCommentError(null);
                    }}
                  />
                </div>
                <div className={`flex items-center gap-2 bg-slate-950/40 rounded-xl pl-4 pr-1 py-1 border focus-within:ring-1 transition-all shadow-inner ${targetPostUrl && !isValidMoltbookUrl(targetPostUrl) ? 'border-red-900/50 focus-within:border-red-500 focus-within:ring-red-500/20' : 'border-slate-800 focus-within:border-emerald-500/30 focus-within:ring-emerald-500/10'}`}>
                  <LinkIcon className={`w-4 h-4 shrink-0 ${targetPostUrl && !isValidMoltbookUrl(targetPostUrl) ? 'text-red-500' : 'text-slate-600'}`} />
                  <input 
                    type="text"
                    placeholder="Target Post URL"
                    className={`bg-transparent border-none focus:outline-none text-sm flex-1 placeholder:text-slate-700 ${targetPostUrl && !isValidMoltbookUrl(targetPostUrl) ? 'text-red-400' : 'text-slate-300'}`}
                    value={targetPostUrl}
                    onChange={(e) => {
                      setTargetPostUrl(e.target.value);
                      if (commentError) setCommentError(null);
                    }}
                  />
                  <button 
                    onClick={handleUrlFetch}
                    disabled={!targetPostUrl.trim() || isFetchingPreview}
                    className="p-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 disabled:opacity-30 transition-colors group/btn"
                    title="Fetch Context from URL"
                  >
                    <Download className={`w-4 h-4 group-hover/btn:translate-y-0.5 transition-transform ${isFetchingPreview ? 'animate-bounce' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 focus-within:border-emerald-500/30 transition-all shadow-inner">
                <textarea 
                  placeholder="Type your reply to the specific post..."
                  className="w-full bg-transparent border-none resize-none h-24 focus:outline-none text-sm text-slate-300 placeholder:text-slate-700"
                  value={pendingComment}
                  onChange={(e) => {
                    setPendingComment(e.target.value);
                    if (commentError) setCommentError(null);
                  }}
                />

                {/* Draft Preview */}
                {pendingComment.trim() && (
                  <div className="mt-4 p-4 bg-slate-900/40 rounded-xl border border-slate-800/50 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Signal Preview (Draft)</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-200">{persona.name || 'Anonymous Agent'}</span>
                          <span className="text-[10px] text-slate-500 mono bg-slate-800/50 px-1.5 rounded uppercase tracking-tighter">
                            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'DISCONNECTED'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 break-words whitespace-pre-wrap leading-relaxed">
                          {pendingComment}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Protocol Context Preview Component */}
                <div className="mt-6 border-t border-slate-800/50 pt-4">
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Protocol Context Preview</span>
                      </div>
                      {targetPostId.trim() && (
                        <button 
                          onClick={() => fetchPreview()}
                          disabled={isFetchingPreview}
                          className="text-[9px] text-slate-600 hover:text-indigo-400 font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                          <RefreshCcw className={`w-2.5 h-2.5 ${isFetchingPreview ? 'animate-spin' : ''}`} />
                          Sync
                        </button>
                      )}
                   </div>
                   
                   {!targetPostId.trim() ? (
                     <div className="p-8 border-2 border-dashed border-slate-800/50 rounded-2xl flex flex-col items-center justify-center text-slate-700 bg-slate-900/20">
                        <Search className="w-8 h-8 mb-2 opacity-10" />
                        <p className="text-xs font-medium italic">Enter a Target Post ID or URL to load protocol context</p>
                     </div>
                   ) : isFetchingPreview ? (
                     <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800/50 flex flex-col items-center justify-center text-indigo-400/80">
                        <div className="relative">
                          <Cpu className="w-8 h-8 animate-pulse opacity-20" />
                          <RefreshCcw className="w-8 h-8 animate-spin absolute inset-0 text-indigo-500" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-4 animate-pulse">Decrypting On-Chain Signal...</p>
                     </div>
                   ) : postPreview?.error ? (
                     <div className="p-6 rounded-2xl bg-red-900/10 border border-red-900/30 flex items-center gap-4 text-red-400/80">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <div>
                          <p className="text-xs font-bold uppercase">Signal Lost</p>
                          <p className="text-[10px]">{postPreview.message || `Post #${targetPostId} was not found on the Moltbook chain. Ensure the ID or URL is correct.`}</p>
                        </div>
                     </div>
                   ) : postPreview ? (
                     <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-inner group transition-all hover:border-emerald-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                          <Globe className="w-12 h-12 text-emerald-500" />
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                           <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0 group-hover:text-emerald-400 transition-colors">
                              <FileText className="w-6 h-6" />
                           </div>
                           <div className="space-y-3 w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded uppercase tracking-tighter border border-emerald-400/20">SIGNAL #{targetPostId}</span>
                                  {postPreview.author && <span className="text-[10px] text-slate-500 font-bold truncate max-w-[120px]">@{postPreview.author.name || 'Anonymous'}</span>}
                                </div>
                                <span className="text-[9px] text-slate-600 font-mono hidden sm:inline">RELAY_SOURCE: 0x...BOOK</span>
                              </div>
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/30">
                                <p className="text-sm text-slate-400 italic leading-relaxed whitespace-pre-wrap">
                                  "{postPreview.content}"
                                </p>
                              </div>
                              {postPreview.timestamp && (
                                <div className="flex items-center gap-2 pt-1 opacity-50">
                                  <Terminal className="w-3 h-3 text-slate-600" />
                                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Protocol Timestamp: {new Date(postPreview.timestamp).toLocaleString()}</span>
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                   ) : null}
                </div>

                <div className="flex items-center justify-end border-t border-slate-800/50 pt-3 mt-4">
                  <button 
                    onClick={publishComment}
                    disabled={!isCommentValid || !address || isCommenting}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-2.5 rounded-full font-black text-xs shadow-xl shadow-emerald-600/10 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest group"
                  >
                    {isCommenting ? (
                      <RefreshCcw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    )}
                    {isCommenting ? 'Injecting Signal...' : 'Inject Response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Activity Feed / Console Log */}
        <section className="flex-1 bg-slate-950/40 border border-slate-900 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-slate-900/40">
            <div className="flex items-center gap-2 text-slate-500">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Protocol Telemetry Logs</span>
            </div>
            <button 
              onClick={() => setLogs([])}
              className="text-slate-700 hover:text-red-400 transition-colors p-1"
              title="Clear Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[300px] font-mono">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col text-slate-800 space-y-4 opacity-50">
                <ShieldCheck className="w-16 h-16 stroke-[1]" />
                <p className="text-xs uppercase tracking-[0.3em] font-medium">Monitoring Active</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="group animate-in fade-in slide-in-from-left-2 duration-300 border-l-2 border-transparent hover:border-indigo-500/30 pl-2 transition-all">
                  <div className="flex gap-3 text-xs">
                    <span className="text-slate-700 shrink-0 text-[9px] pt-1">
                      {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <div className="space-y-1 overflow-hidden w-full">
                      <p className={`
                        font-medium leading-relaxed
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-green-500' : ''}
                        ${log.type === 'info' ? 'text-indigo-400' : ''}
                        ${log.type === 'request' ? 'text-amber-500' : ''}
                      `}>
                        <span className="opacity-50 font-bold mr-2 text-[10px] tracking-tighter">[{log.type.toUpperCase()}]</span>
                        {log.message}
                      </p>
                      {log.details && (
                        <pre className="text-[10px] bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 text-slate-600 overflow-x-auto my-2">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Resource Footer / Helper links */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/90 backdrop-blur-xl border-t border-slate-900/50 flex justify-center gap-10 text-[9px] text-slate-600 font-bold uppercase tracking-[0.1em] z-50">
        <a href="https://moltbookai.net/skill.json" target="_blank" className="hover:text-indigo-400 flex items-center gap-1.5 transition-colors">
          <Settings className="w-3 h-3" /> Skill Definition
        </a>
        <a href="https://moltbookai.net/heartbeat.md" target="_blank" className="hover:text-indigo-400 flex items-center gap-1.5 transition-colors">
          <Activity className="w-3 h-3" /> Heartbeat Prot.
        </a>
        <a href="https://ai.google.dev" target="_blank" className="hover:text-indigo-400 flex items-center gap-1.5 transition-colors">
          <ExternalLink className="w-3 h-3" /> Gemini Core
        </a>
      </footer>

      {/* CSS Scrollbar Styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
