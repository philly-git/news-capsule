'use client';

import { useState } from 'react';

export default function FeedbackModal({ isOpen, onClose, language = 'zh' }) {
    const [content, setContent] = useState('');
    const [contact, setContact] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, contact }),
            });
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setContent('');
                    setContact('');
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to submit feedback', error);
        } finally {
            setSubmitting(false);
        }
    };

    const t = {
        title: language === 'zh' ? '联系编辑部' : 'Contact Editorial Dept',
        desc: language === 'zh' ? '感谢你的反馈，我们会认真阅读每一条建议。' : 'Thanks for your feedback, we read every suggestion carefully.',
        contentLabel: language === 'zh' ? '反馈内容' : 'Feedback Content',
        contentPlaceholder: language === 'zh' ? '请输入你的建议、想看到的新闻源等...' : 'Your suggestions, request for sources, etc...',
        contactLabel: language === 'zh' ? '联系方式' : 'Contact Info',
        contactPlaceholder: language === 'zh' ? '邮箱或微信（必填，以便我们回复你）' : 'Email or WeChat (Required)',
        submit: language === 'zh' ? '发送' : 'Send',
        submitting: language === 'zh' ? '发送中...' : 'Sending...',
        success: language === 'zh' ? '发送成功！' : 'Sent Successfully!',
    };

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal">
                <button className="modal-close" onClick={onClose}>×</button>

                <h3 className="modal-title">{t.title}</h3>
                <p className="modal-description">{t.desc}</p>

                {success ? (
                    <div className="text-center" style={{ padding: '40px 0', color: 'var(--success)' }}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '16px' }}>✓</span>
                        {t.success}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-md">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
                                {t.contentLabel} <span style={{ color: 'red' }}>*</span>
                            </label>
                            <textarea
                                className="modal-input"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={t.contentPlaceholder}
                                required
                                rows={4}
                                style={{ resize: 'vertical', minHeight: '100px' }}
                            />
                        </div>

                        <div className="mb-lg">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
                                {t.contactLabel} <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="modal-input"
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                placeholder={t.contactPlaceholder}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="modal-submit"
                            disabled={submitting}
                            style={{ opacity: submitting ? 0.7 : 1 }}
                        >
                            {submitting ? t.submitting : t.submit}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
