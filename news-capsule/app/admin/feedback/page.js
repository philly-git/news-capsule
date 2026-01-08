'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

export default function FeedbackPage() {
    const [feedbackList, setFeedbackList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/feedback')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setFeedbackList(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch feedback', err);
                setLoading(false);
            });
    }, []);

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.adminPage}>
            <div className={styles.header}>
                <h1 className={styles.title}>用户反馈</h1>
                <div className={styles.actions}>
                    <span className={styles.subtitle}>共 {feedbackList.length} 条反馈</span>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>加载中...</div>
            ) : feedbackList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>暂无反馈</div>
            ) : (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                <th style={{ padding: '12px', width: '160px' }}>时间</th>
                                <th style={{ padding: '12px', width: '200px' }}>联系方式</th>
                                <th style={{ padding: '12px' }}>反馈内容</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feedbackList.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px', color: '#666' }}>{formatDate(item.timestamp)}</td>
                                    <td style={{ padding: '12px', fontWeight: 500 }}>{item.contact}</td>
                                    <td style={{ padding: '12px', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
