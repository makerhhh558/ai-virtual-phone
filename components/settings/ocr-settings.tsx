"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { Plus, AlertCircle, FileEdit, Trash2, X, Check, Rss } from "lucide-react";
import { SettingsContext } from "../phone-settings-app";
import type { OcrApiConfig } from "@/lib/settings-types";
import { loadOcrConfigs, saveOcrConfigs } from "@/lib/settings-storage";
import { ConfirmDialog } from "@/components/ui/modal";
import { Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";

const DEFAULT_CONFIGS: OcrApiConfig[] = [];

const OCR_PROVIDERS = [
    { value: "OpenAI", label: "OpenAI (GPT-4o OCR)" },
    { value: "Baidu", label: "百度 OCR" },
    { value: "Tencent", label: "腾讯 OCR" },
    { value: "Aliyun", label: "阿里云 OCR" },
    { value: "Custom", label: "自定义 (Custom)" },
];

export function OcrSettings() {
    const { setSubpageRightAction } = useContext(SettingsContext);
    const [configs, setConfigs] = useState<OcrApiConfig[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isNewConfig, setIsNewConfig] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
    const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

    useEffect(() => {
        const loaded = loadOcrConfigs();
        setConfigs(loaded.length > 0 ? loaded : DEFAULT_CONFIGS);
        setIsLoaded(true);
    }, []);

    const persist = useCallback((newConfigs: OcrApiConfig[]) => {
        setConfigs(newConfigs);
        saveOcrConfigs(newConfigs);
    }, []);

    const addConfig = useCallback(() => {
        const newConfig: OcrApiConfig = {
            id: `ocr-${Date.now()}`,
            name: "新 OCR 配置",
            provider: "Custom",
            apiKey: "",
            baseUrl: "",
            defaultModel: "",
            language: "auto",
        };
        persist([...configs, newConfig]);
        setIsNewConfig(true);
        setEditingId(newConfig.id);
    }, [configs, persist]);

    useEffect(() => {
        setSubpageRightAction("ocr",
            <button
                onClick={addConfig}
                className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[20px] bg-black px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md active:scale-95 focus:outline-none"
            >
                <Plus size={15} strokeWidth={1.8} />
                <span>新增OCR方案</span>
            </button>
        );
        return () => setSubpageRightAction("ocr", null);
    }, [addConfig, setSubpageRightAction]);

    const updateConfig = (id: string, updates: Partial<OcrApiConfig>) => {
        persist(configs.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const removeConfig = (id: string) => {
        persist(configs.filter(c => c.id !== id));
        const newTestResults = { ...testResult };
        delete newTestResults[id];
        setTestResult(newTestResults);
    };

    const testConnection = async (config: OcrApiConfig) => {
        if (!config.apiKey) {
            setTestResult(prev => ({ ...prev, [config.id]: { success: false, message: "请先填写 API Key" } }));
            return;
        }
        if (!config.baseUrl && config.provider === "Custom") {
            setTestResult(prev => ({ ...prev, [config.id]: { success: false, message: "自定义服务商需填写 Base URL" } }));
            return;
        }

        setIsTesting(prev => ({ ...prev, [config.id]: true }));
        setTestResult(prev => ({ ...prev, [config.id]: { success: false, message: "" } }));

        try {
            // Simple connectivity test: try to reach the endpoint
            const baseUrl = config.baseUrl || getDefaultOcrBaseUrl(config.provider);
            if (!baseUrl) throw new Error("无法确定 OCR 服务端点");

            const response = await fetch(baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    // Minimal test payload — a 1x1 white pixel PNG in base64
                    image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                    language: config.language || "auto",
                }),
            });

            if (response.ok) {
                setTestResult(prev => ({
                    ...prev,
                    [config.id]: { success: true, message: "连接成功！OCR 服务可用" },
                }));
            } else {
                const errorData = await response.json().catch(() => ({}));
                const msg = (errorData as Record<string, unknown>)?.error
                    ? String((errorData as Record<string, { message?: string }>).error?.message || (errorData as Record<string, unknown>).error)
                    : `HTTP ${response.status}`;
                setTestResult(prev => ({
                    ...prev,
                    [config.id]: { success: false, message: `测试失败: ${msg}` },
                }));
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            setTestResult(prev => ({ ...prev, [config.id]: { success: false, message: `测试失败: ${msg}` } }));
        } finally {
            setIsTesting(prev => ({ ...prev, [config.id]: false }));
        }
    };

    if (!isLoaded) return null;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center">
                <h2 className="m-0 mx-2 ts-28 font-bold italic leading-none text-black">OCR Settings</h2>
            </div>

            <div className="mx-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                <AlertCircle size={16} className="mt-[1px] shrink-0" />
                <span>OCR 仅能提取图片中的文字内容。当 API 配置未启用图像识别时，将使用此 OCR 通道作为回退方案。纯图片（无文字）内容无法通过 OCR 识别。</span>
            </div>

            {configs.length === 0 ? (
                <div className="ui-empty">
                    <div className="ui-icon-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M9 15l2 2 4-4" />
                        </svg>
                    </div>
                    <span className="menu-label font-semibold">没有 OCR 配置</span>
                    <span className="menu-desc max-w-[240px]">
                        配置 OCR API 以在图像识别关闭时提取图片中的文字。
                    </span>
                    <button onClick={addConfig} className="ui-btn ui-btn-primary rounded-[20px] mt-2">
                        <Plus size={16} /> 添加配置
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {configs.map(config => (
                        <div
                            key={config.id}
                            className="ui-config-card min-w-0 cursor-pointer"
                            style={{ aspectRatio: "3 / 2", padding: "12px", justifyContent: "space-between" }}
                            role="button"
                            tabIndex={0}
                            aria-label={`编辑 ${config.name || config.provider}`}
                            onClick={() => setEditingId(config.id)}
                            onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setEditingId(config.id);
                                }
                            }}
                        >
                            <div className="min-w-0 flex flex-col gap-1">
                                <span className="truncate text-[calc(14.4px*var(--app-text-scale,1))] font-bold leading-tight text-[var(--c-text-title)]">{config.name || config.provider}</span>
                                <span className="menu-desc truncate">{config.provider || "未设置"}</span>
                            </div>
                            <div className="flex gap-2 shrink-0 items-center justify-end">
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); setEditingId(config.id); }}
                                    className="ui-link-btn"
                                >
                                    <FileEdit size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); setConfirmDeleteId(config.id); }}
                                    className="ui-link-btn"
                                    data-variant="danger"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingId && (
                <div className="modal-overlay modal-overlay-bottom">
                    <div className="modal-sheet" data-ui="modal-sheet">
                        <div className="modal-header" data-ui="modal-header">
                            <button onClick={() => { if (isNewConfig && editingId) removeConfig(editingId); setIsNewConfig(false); setEditingId(null); }} className="modal-header-btn modal-header-btn-muted"><X size={18} /></button>
                            <span className="modal-header-title">{isNewConfig ? "添加 OCR 配置" : "编辑 OCR 配置"}</span>
                            <button onClick={() => { setIsNewConfig(false); setEditingId(null); }} className="modal-header-btn modal-header-btn-action"><Check size={18} /></button>
                        </div>

                        <div className="modal-body hide-scrollbar flex flex-col gap-4 pb-10" data-ui="modal-body">
                            {(() => {
                                const config = configs.find(c => c.id === editingId);
                                if (!config) return null;
                                return (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <label className="menu-desc ml-1">配置名称 (Name)</label>
                                            <Input
                                                type="text"
                                                value={config.name || ""}
                                                onChange={(e) => updateConfig(config.id, { name: e.target.value })}
                                                placeholder="例如: 我的 OCR 服务"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="menu-desc ml-1">服务商 (Provider)</label>
                                            <select
                                                value={config.provider}
                                                onChange={(e) => updateConfig(config.id, { provider: e.target.value })}
                                                className="ui-select"
                                            >
                                                {OCR_PROVIDERS.map(p => (
                                                    <option key={p.value} value={p.value}>{p.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="menu-desc ml-1">
                                                Base URL {config.provider === "Custom" ? "（必填）" : "（可选，留空用默认端点）"}
                                            </label>
                                            <Input
                                                type="url"
                                                value={config.baseUrl || ""}
                                                onChange={(e) => updateConfig(config.id, { baseUrl: e.target.value })}
                                                placeholder={
                                                    config.provider === "Custom"
                                                        ? "https://api.example.com/ocr"
                                                        : "留空使用默认端点"
                                                }
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="menu-desc ml-1">API Key</label>
                                            <Input
                                                type="password"
                                                value={config.apiKey}
                                                onChange={(e) => updateConfig(config.id, { apiKey: e.target.value })}
                                                placeholder="输入 API Key..."
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="menu-desc ml-1">识别语言 (Language)</label>
                                            <select
                                                value={config.language || "auto"}
                                                onChange={(e) => updateConfig(config.id, { language: e.target.value })}
                                                className="ui-select"
                                            >
                                                <option value="auto">自动检测</option>
                                                <option value="zh">中文</option>
                                                <option value="en">English</option>
                                                <option value="ja">日本語</option>
                                                <option value="ko">한국어</option>
                                                <option value="mixed">中英混合</option>
                                            </select>
                                        </div>

                                        {config.provider === "OpenAI" && (
                                            <div className="flex flex-col gap-1">
                                                <label className="menu-desc ml-1">模型 (Model)</label>
                                                <Input
                                                    type="text"
                                                    value={config.defaultModel || ""}
                                                    onChange={(e) => updateConfig(config.id, { defaultModel: e.target.value })}
                                                    placeholder="gpt-4o-mini"
                                                />
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-1">
                                            <button
                                                onClick={() => testConnection(config)}
                                                disabled={isTesting[config.id]}
                                                className="ui-btn ui-btn ui-btn-success flex-1"
                                            >
                                                <Rss size={16} className={isTesting[config.id] ? "animate-spin" : ""} />
                                                {isTesting[config.id] ? "测试中..." : "测试连接"}
                                            </button>
                                        </div>

                                        {testResult[config.id] && testResult[config.id].message && (
                                            <Alert variant={testResult[config.id].success ? "success" : "danger"}>
                                                <AlertCircle size={16} className="mt-[2px] shrink-0" />
                                                <span className="break-all leading-[1.5]">{testResult[config.id].message}</span>
                                            </Alert>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {confirmDeleteId && (
                <ConfirmDialog
                    title="确认删除？"
                    message="删除配置后无法恢复。是否继续？"
                    icon={AlertCircle}
                    variant="danger"
                    confirmLabel="确认删除"
                    cancelLabel="取消"
                    onConfirm={() => { removeConfig(confirmDeleteId); setConfirmDeleteId(null); }}
                    onCancel={() => setConfirmDeleteId(null)}
                />
            )}
        </div>
    );
}

function getDefaultOcrBaseUrl(provider: string): string {
    switch (provider) {
        case "OpenAI": return "https://api.openai.com/v1/chat/completions";
        case "Baidu": return "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic";
        case "Tencent": return "https://ocr.tencentcloudapi.com";
        case "Aliyun": return "https://ocr-api.cn-hangzhou.aliyuncs.com";
        default: return "";
    }
}
