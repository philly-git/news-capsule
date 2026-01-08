'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminLayout({ children }) {
    const pathname = usePathname();

    const navItems = [
        { href: '/admin', label: '📰 编辑部', exact: true },
        { href: '/admin/publishing', label: '🏭 印刷厂', exact: true },
        { href: '/admin/sources/add', label: '➕ 添加信息源' },
        { href: '/admin/articles', label: '📄 文章内容', exact: true },
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
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
