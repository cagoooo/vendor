/**
 * 頁尾作者署名列
 * 放在各頁尾最後一行：Made with ❤️ by 阿凱老師（連到阿凱老師教育科技創新專區）・學校名稱
 */

export function SiteCredit({ className = '' }: { className?: string }) {
    return (
        <p
            className={`site-credit mt-4 pt-4 border-t border-gray-800 text-sm text-gray-400 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-x-1 gap-y-1 print:hidden ${className}`}
        >
            <span>
                Made with <span aria-label="愛心" className="inline-block mx-0.5">❤️</span> by{' '}
                <a
                    href="https://cagoooo.github.io/Akai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="阿凱老師教育科技創新專區"
                    className="site-credit__author font-bold text-orange-400 hover:text-orange-300 border-b border-dotted border-current py-1"
                >
                    阿凱老師
                </a>
            </span>
            <span>
                <span aria-hidden="true" className="hidden sm:inline">・</span>
                桃園市龍潭區石門國民小學
            </span>
        </p>
    );
}
