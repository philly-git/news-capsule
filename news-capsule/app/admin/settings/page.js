'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

export default function SettingsPage() {
    const [apiKeyData, setApiKeyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newApiKey, setNewApiKey] = useState('');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchApiKeyStatus();
    }, []);

    async function fetchApiKeyStatus() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/api-keys');
            const data = await res.json();
            setApiKeyData(data);
        } catch (error) {
            console.error('Failed to fetch API key status:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleTestConnection() {
        if (!newApiKey.trim()) return;

        setTesting(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: newApiKey, testOnly: true })
            });
            const data = await res.json();

            if (data.success) {
                setTestResult({
                    success: true,
                    models: data.models,
                    keyPreview: data.keyPreview
                });
            } else {
                setTestResult({
                    success: false,
                    error: data.error || 'Unknown error'
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                error: error.message
            });
        } finally {
            setTesting(false);
        }
    }

    async function handleSaveApiKey() {
        if (!newApiKey.trim()) return;

        setSaving(true);
        try {
            const res = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: newApiKey, testOnly: false })
            });
            const data = await res.json();

            if (data.success) {
                setNewApiKey('');
                setTestResult(null);
                await fetchApiKeyStatus();
            } else {
                setTestResult({
                    success: false,
                    error: data.error || 'Failed to save'
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                error: error.message
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteApiKey() {
        if (!confirm('确定要删除已保存的 API Key 吗？')) return;

        try {
            await fetch('/api/admin/api-keys', { method: 'DELETE' });
            await fetchApiKeyStatus();
        } catch (error) {
            console.error('Failed to delete API key:', error);
        }
    }

    const openai = apiKeyData?.openai || {};

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>⚙️ 设置</h1>
            </header>

            {loading && <div className={styles.loading}>加载中...</div>}

            {!loading && (
                <>
                    {/* OpenAI API Key 配置 */}
                    <section className={styles.section}>
                        <h2>🔑 OpenAI API Key</h2>

                        {/* 当前状态 */}
                        <div className={styles.infoCard} style={{ marginBottom: '1rem' }}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>状态</span>
                                <span className={styles.infoValue}>
                                    {openai.configured ? (
                                        <span style={{ color: '#059669' }}>✓ 已配置</span>
                                    ) : (
                                        <span style={{ color: '#dc2626' }}>✗ 未配置</span>
                                    )}
                                </span>
                            </div>
                            {openai.configured && (
                                <>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Key</span>
                                        <span className={styles.infoValue} style={{ fontFamily: 'monospace' }}>
                                            {openai.keyPreview}
                                        </span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>来源</span>
                                        <span className={styles.infoValue}>
                                            {openai.keySource === 'env' ? '环境变量 (.env)' :
                                                openai.keySource === 'settings' ? '设置文件' : '-'}
                                        </span>
                                    </div>
                                </>
                            )}
                            {openai.error && (
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>错误</span>
                                    <span className={styles.infoValue} style={{ color: '#dc2626' }}>
                                        {openai.error}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 可用模型列表 */}
                        {openai.models?.length > 0 && (
                            <div className={styles.infoCard} style={{ marginBottom: '1rem' }}>
                                <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#37352f' }}>
                                    可用模型 ({openai.models.length})
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {openai.models.map(model => (
                                        <span
                                            key={model}
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                background: '#f7f6f3',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem',
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {model}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 设置新 Key */}
                        <div className={styles.infoCard}>
                            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#37352f' }}>
                                {openai.configured ? '更新 API Key' : '设置 API Key'}
                            </h3>

                            <div className={styles.inputGroup}>
                                <input
                                    type="password"
                                    className={styles.textInput}
                                    placeholder="sk-..."
                                    value={newApiKey}
                                    onChange={(e) => setNewApiKey(e.target.value)}
                                />
                                <button
                                    onClick={handleTestConnection}
                                    disabled={!newApiKey.trim() || testing}
                                    className={styles.primaryBtn}
                                    style={{ background: '#6b7280' }}
                                >
                                    {testing ? '测试中...' : '测试连接'}
                                </button>
                            </div>

                            {/* 测试结果 */}
                            {testResult && (
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '6px',
                                    marginBottom: '0.75rem',
                                    background: testResult.success ? '#d1fae5' : '#fee2e2',
                                    color: testResult.success ? '#047857' : '#dc2626'
                                }}>
                                    {testResult.success ? (
                                        <>
                                            <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                                                ✓ 连接成功！发现 {testResult.models.length} 个可用模型
                                            </div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                                Key: {testResult.keyPreview}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontWeight: 500 }}>✗ 连接失败</div>
                                            <div style={{ fontSize: '0.85rem' }}>{testResult.error}</div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* 保存按钮 */}
                            {testResult?.success && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={handleSaveApiKey}
                                        disabled={saving}
                                        className={styles.saveBtn}
                                    >
                                        {saving ? '保存中...' : '保存 API Key'}
                                    </button>
                                </div>
                            )}

                            {/* 删除已保存的 Key */}
                            {openai.keySource === 'settings' && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #ebebea' }}>
                                    <button
                                        onClick={handleDeleteApiKey}
                                        style={{
                                            padding: '0.4rem 0.75rem',
                                            background: 'transparent',
                                            color: '#dc2626',
                                            border: '1px solid #fecaca',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        删除已保存的 Key
                                    </button>
                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#9b9a97' }}>
                                        将回退到使用环境变量
                                    </span>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
