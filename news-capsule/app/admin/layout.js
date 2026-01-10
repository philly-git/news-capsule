'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './admin.module.css';

export default function AdminLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [username, setUsername] = useState('');

    // 登录页面不需要认证检查
    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        if (isLoginPage) {
            setIsLoading(false);
            return;
        }

        // 检查认证状态
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/check');
                const data = await res.json();

                if (data.authenticated) {
                    setIsAuthenticated(true);
                    setUsername(data.username);
                } else {
                    router.push('/admin/login');
                }
            } catch (error) {
                router.push('/admin/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [pathname, isLoginPage, router]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/admin/login');
            router.refresh();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // 登录页面直接渲染
    if (isLoginPage) {
        return <>{children}</>;
    }

    // 加载中
    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}>加载中...</div>
            </div>
        );
    }

    // 未认证（理论上此时已跳转，但作为保险）
    if (!isAuthenticated) {
        return null;
    }

    const navItems = [
        { href: '/admin', label: '📰 编辑部', exact: true },
        { href: '/admin/publishing', label: '🏭 印刷厂', exact: true },
        { href: '/admin/published', label: '📚 已出版内容', exact: true },
        { href: '/admin/sources/add', label: '➕ 添加信息源' },
        { href: '/admin/prompt-debugger', label: '🧪 Prompt 调试' },
        { href: '/admin/settings', label: '⚙️ 设置' },
        { href: '/admin/feedback', label: '💬 用户反馈' },
    ];

    const isActive = (item) => {
        if (item.exact) {
            return pathname === item.href;
        }
        return pathname.startsWith(item.href);
    };

    return (
        <div className={styles.adminLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <Link href="/" className={styles.logoLink}>
                        💊 新闻胶囊
                    </Link>
                </div>
                <nav className={styles.sidebarNav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive(item) ? styles.navItemActive : ''}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <span className={styles.userIcon}>👤</span>
                        <span className={styles.userName}>{username}</span>
                    </div>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        退出登录
                    </button>
                </div>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}

