export default function Footer({ language = 'zh' }) {
    const text = language === 'zh'
        ? '💊 新闻胶囊 - 像吞服胶囊一样简单获取科技资讯'
        : '💊 News Capsule - Tech news made simple';

    return (
        <footer className="page-footer">
            <div className="container">
                <p>{text}</p>
            </div>
        </footer>
    );
}
