'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function AboutContent() {
    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') || 'zh';
    const isEn = lang === 'en';
    const [showWeChat, setShowWeChat] = useState(false);

    const texts = {
        title: isEn ? 'About News Capsule' : '关于新闻胶囊',
        subtitle: 'News Capsule',
        section1: {
            title: isEn ? 'Why News Capsule?' : '为什么会有新闻胶囊',
            p1: isEn ?
                'AI can do many things now, and one of the most common tasks is "summarize this news/text/paper/video/podcast for me".' :
                'AI现在可以做很多事情，其中最常见的一件事就是“帮我总结这个新闻/文字/论文/视频/播客”',
            p2: isEn ?
                'I personally benefit greatly from this feature as it speeds up my information intake significantly. However, I also worry that when "everything can be summarized," the original text loses its meaning, and right now we might lose our ability to appreciate content.' :
                '我个人非常受益于这个功能，因为它我了解信息的速度增加了很多，但我也担心当”万物皆可总结“后，原文将变得不再有意义。而我们也将丧失对于内容的品鉴能力。',
            p3: isEn ?
                'To balance efficiency and depth, I developed News Capsule. It provides news summaries for quick understanding while offering suggestions for reading the original text to help you dive deeper.' :
                '为了平衡效率和深度，我开发了新闻胶囊，它既能提供新闻的总结让你快速了解信息，也提供了阅读原文的建议让你能更深入地了解信息。',
            p4: isEn ?
                'So after taking the capsule, remember to pick an apple and chew on it :)' :
                '所以吃了胶囊之后，也记得选颗苹果嚼一嚼 :)',
        },
        feed_section: {
            title: isEn ? 'Make News Capsule More Nutritious' : '让新闻胶囊变得更有营养',
            p1: isEn ?
                'Summarizing article content requires the Large Language Model to "read" the full text. However, most RSS feeds only provide titles rather than the full content, which limits the number of sources I can currently include. If you have high-quality RSS feeds, please share them with us.' :
                '因为总结文章内容需要让大模型‘阅读’文章全文，而大多数rss源只能提供新闻的标题而非全文，因此当前我能找到的rss源较少，如果你有优质的rss源，欢迎分享给我们'
        },
        section2: {
            title: isEn ? 'About the Author' : '关于作者',
            p1: isEn ?
                'I am Phil, someone trying to use AI coding to turn ideas into reality.' :
                '我是 Phil，一个正在尝试使用ai coding来实践自己脑中想法的人。',
            p2: isEn ?
                'News Capsule is my personal side project. In my previous work, I worked as a data scientist in dating apps and short video platforms, and also had experience in GTM and customer success for SaaS products.' :
                '新闻胶囊是我个人开发的 Side Project。在之前的工作中，我曾在约会软件和短视频平台做过数据科学家，也有过saas产品GTM和客户成功经验。'
        },
        section3: {
            title: isEn ? 'Contact' : '联系方式',
            intro: isEn ?
                'I currently live in Singapore. If you are interested in this project, have a news source you want to see, or have any suggestions or feedback, feel free to contact me. You are also welcome to ask me out for coffee or a meal:' :
                '我现在居住在新加坡，如果你对这个项目感兴趣，或者有自己想要的新闻源，又或者有任何建议和反馈，欢迎通过下面的方式联系我，也欢迎来约我喝咖啡或吃饭：'
        },
        back: isEn ? '← Back to Home' : '← 返回首页'
    };

    return (
        <div style={{
            backgroundColor: '#fafaf9', // Warm gray background for the whole page feel
            minHeight: '100vh',
            color: '#37352f',
            fontFamily: 'var(--font-sans)',
            paddingBottom: '64px'
        }}>
            {/* Header with subtle gradient */}
            <header style={{
                background: 'linear-gradient(to bottom, #ffffff, #fafaf9)',
                padding: '80px 24px 48px',
                textAlign: 'center',
                borderBottom: '1px solid rgba(0,0,0,0.04)'
            }}>
                <div className="container" style={{ maxWidth: '680px', margin: '0 auto' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        marginBottom: '16px',
                        letterSpacing: '-0.02em',
                        fontFamily: "'Georgia', serif" // Editorial touch
                    }}>
                        {texts.title}
                    </h1>
                </div>
            </header>

            <main className="container" style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px' }}>

                {/* Section 1: Philosophy - Reverted to Simple Style */}
                <section style={{ marginBottom: '64px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '32px',
                        width: 'fit-content'
                    }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9b9a97' }}>
                            {texts.section1.title}
                        </h2>
                        <div style={{ height: '1px', width: '40px', backgroundColor: '#e3e2de' }}></div>
                    </div>

                    <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#4a4a4a' }}>
                        <p style={{ marginBottom: '16px' }}>{texts.section1.p1}</p>
                        <p style={{ marginBottom: '16px' }}>{texts.section1.p3}</p>
                        <p style={{ marginBottom: '16px' }}>{texts.section1.p4}</p>
                    </div>
                </section>

                {/* Feed Contribution Section - Standalone */}
                <section style={{ marginBottom: '64px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '32px',
                        width: 'fit-content'
                    }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9b9a97' }}>
                            {texts.feed_section.title}
                        </h2>
                        <div style={{ height: '1px', width: '40px', backgroundColor: '#e3e2de' }}></div>
                    </div>

                    <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#4a4a4a' }}>
                        <p style={{ marginBottom: '16px' }}>{texts.feed_section.p1}</p>
                    </div>
                </section>


                {/* Section 2: Author - Profile Layout */}
                <section style={{ marginBottom: '64px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '32px',
                        width: 'fit-content'
                    }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9b9a97' }}>
                            {texts.section2.title}
                        </h2>
                        <div style={{ height: '1px', width: '40px', backgroundColor: '#e3e2de' }}></div>
                    </div>

                    <div style={{ fontSize: '1rem', lineHeight: '1.7', color: '#4a4a4a' }}>
                        <p style={{ marginBottom: '16px' }}>{texts.section2.p1}</p>
                        <p style={{ marginBottom: '16px' }}>{texts.section2.p2}</p>
                    </div>
                </section>

                {/* Section 3: Contact - Grid Layout */}
                <section style={{ marginBottom: '80px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '32px',
                        width: 'fit-content'
                    }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9b9a97' }}>
                            {texts.section3.title}
                        </h2>
                        <div style={{ height: '1px', width: '40px', backgroundColor: '#e3e2de' }}></div>
                    </div>
                    <p style={{ color: '#6b6b6b', marginBottom: '40px' }}>{texts.section3.intro}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                        <a href="mailto:im.ziyue.gao@gmail.com" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e3e2de',
                            textDecoration: 'none',
                            color: '#37352f',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}>
                            <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📧</span>
                            <span style={{ fontWeight: '500', fontSize: '0.925rem' }}>Email</span>
                        </a>

                        <a href="https://www.linkedin.com/in/ziyuegao/" target="_blank" rel="noopener noreferrer" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e3e2de',
                            textDecoration: 'none',
                            color: '#37352f',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}>
                            <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💼</span>
                            <span style={{ fontWeight: '500', fontSize: '0.925rem' }}>LinkedIn</span>
                        </a>

                        {!isEn && (
                            <div onClick={() => setShowWeChat(!showWeChat)} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '24px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #e3e2de',
                                textDecoration: 'none',
                                color: '#37352f',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}>
                                <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💬</span>
                                <span style={{ fontWeight: '500', fontSize: '0.925rem' }}>WeChat</span>
                            </div>
                        )}
                    </div>

                    {/* WeChat QR Dropdown */}
                    {!isEn && showWeChat && (
                        <div style={{
                            marginTop: '24px',
                            padding: '32px',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #e3e2de',
                            textAlign: 'center',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            <img src="/wechat-qr.jpg" alt="WeChat QR Code" style={{ maxWidth: '200px', margin: '0 auto 16px', display: 'block', borderRadius: '4px' }} />
                            <p style={{ fontSize: '0.875rem', color: '#9b9a97', margin: 0 }}>扫描二维码，添加为好友</p>
                        </div>
                    )}
                </section>

                <footer style={{ textAlign: 'center', paddingTop: '32px', borderTop: '1px solid #ebebea' }}>
                    <Link href={isEn ? '/?lang=en' : '/'} style={{
                        color: '#6b6b6b',
                        textDecoration: 'none',
                        fontSize: '0.925rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'color 0.2s ease'
                    }}>
                        {texts.back}
                    </Link>
                </footer>
            </main>
        </div >
    );
}

export default function AboutPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AboutContent />
        </Suspense>
    );
}
