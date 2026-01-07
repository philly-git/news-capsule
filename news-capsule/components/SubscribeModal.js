'use client';

import { useState } from 'react';

export default function SubscribeModal({ isOpen, onClose, subscriberCount = 0, language = 'zh' }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const t = {
        title: language === 'zh' ? '📬 订阅每日科技速递' : '📬 Subscribe to Daily Tech Digest',
        description: language === 'zh'
            ? '每天早8点，将今日要闻发送到您的邮箱'
            : 'Get top tech stories delivered daily at 8am',
        placeholder: language === 'zh' ? '请输入邮箱地址' : 'Enter your email',
        submit: language === 'zh' ? '确认订阅' : 'Subscribe',
        submitting: language === 'zh' ? '提交中...' : 'Submitting...',
        success: language === 'zh'
            ? '订阅成功！我们会在每天早8点发送科技要闻。'
            : 'Subscribed! You will receive daily tech news at 8am.',
        invalidEmail: language === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email',
        error: language === 'zh' ? '订阅失败，请稍后重试' : 'Subscription failed, please try again',
        subscribers: language === 'zh' ? '位读者订阅' : 'subscribers',
        alreadySubscribed: language === 'zh' ? '已有' : '',
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setStatus('error');
            setMessage(t.invalidEmail);
            return;
        }

        setStatus('loading');

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(t.success);
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || t.error);
            }
        } catch (error) {
            setStatus('error');
            setMessage(t.error);
        }
    };

    const handleClose = () => {
        setStatus('idle');
        setMessage('');
        setEmail('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className={`modal-overlay ${isOpen ? 'active' : ''}`}
            onClick={handleClose}
        >
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'relative' }}
            >
                <button className="modal-close" onClick={handleClose} aria-label="Close">×</button>

                <h3 className="modal-title">{t.title}</h3>
                <p className="modal-description">{t.description}</p>

                {status === 'success' ? (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--space-lg)',
                        background: 'var(--success-bg)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--success)'
                    }}>
                        ✅ {message}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            className="modal-input"
                            placeholder={t.placeholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={status === 'loading'}
                        />

                        {status === 'error' && (
                            <p style={{
                                color: '#e03e3e',
                                fontSize: '0.875rem',
                                marginBottom: 'var(--space-md)',
                                marginTop: 'calc(-1 * var(--space-sm))'
                            }}>
                                {message}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="modal-submit"
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? t.submitting : t.submit}
                        </button>
                    </form>
                )}

                {subscriberCount > 0 && (
                    <p className="modal-footer">
                        {t.alreadySubscribed} {subscriberCount.toLocaleString()} {t.subscribers}
                    </p>
                )}
            </div>
        </div>
    );
}
