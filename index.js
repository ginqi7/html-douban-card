const { BookSpider, MovieSpider, MusicSpider } = require("./spiders");
const renderer = require("./renderer");
const path = require("path");
const fs = require("hexo-fs");
const HexoLog = require("hexo-log");
const cheerio = require("cheerio");
doubanCard = {
    cookie: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    imgProxy: "https://images.weserv.nl/?url=",
};
var cookie, imgProxy;
if (doubanCard) {
    cookie = doubanCard.cookie;
    imgProxy = doubanCard.imgProxy;
}

const DOUBAN_CARD_BOOK_TEMPLATE = path.resolve(
    __dirname,
    "./templates/bookCard.html",
);
const DOUBAN_CARD_MOVIE_TEMPLATE = path.resolve(
    __dirname,
    "./templates/movieCard.html",
);
const DOUBAN_CARD_MUSIC_TEMPLATE = path.resolve(
    __dirname,
    "./templates/musicCard.html",
);
const DOUBAN_CARD_STYEL = path.resolve(
    __dirname,
    "./templates/assets/style.css",
);
var bookSpider = new BookSpider(
    HexoLog({ name: "douban-book-card" }),
    cookie,
    imgProxy,
);
var movieSpider = new MovieSpider(
    HexoLog({ name: "douban-movie-card" }),
    cookie,
    imgProxy,
);
var musicSpider = new MusicSpider(
    HexoLog({ name: "douban-music-card" }),
    cookie,
    imgProxy,
);
var logger = HexoLog({ name: "douban-card-index" });

/**
 * Parse the Douban URLs in the HTML and replace them with the rendered output.
 * @param {string} html - input HTML
 * @returns {Promise<string>} - replaced HTML
 */
async function replaceDoubanUrls(html) {
    const $ = cheerio.load(html); // Load HTML

    // Query all <a> tags containing douban URL
    const links = $(
        'a[href*="https://movie.douban.com/subject/"], a[href*="https://music.douban.com/subject/"], a[href*="https://book.douban.com/subject/"]',
    );

    // Iterate through each link
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const href = $(link).attr("href");

        // Extract douban type and ID
        const match = href.match(
            /https:\/\/(movie|music|book)\.douban\.com\/subject\/(\d+)/,
        );
        if (match && match[1] && match[2]) {
            const doubanType = match[1];
            const doubanId = match[2];
            let doubanInfo;
            let template;
            if (doubanType == "movie") {
                doubanInfo = await movieSpider.crawl(doubanId);
                template = DOUBAN_CARD_MOVIE_TEMPLATE;
            } else if (doubanType == "book") {
                doubanInfo = await bookSpider.crawl(doubanId);
                template = DOUBAN_CARD_BOOK_TEMPLATE;
            } else if (doubanType == "music") {
                doubanInfo = await musicSpider.crawl(doubanId);
                template = DOUBAN_CARD_MUSIC_TEMPLATE;
            } else {
                console.log("Not support type douban URL");
                return html;
            }
            try {
                const res = await new Promise((resolve, reject) => {
                    renderer.render(template, { ...doubanInfo }, (err, res) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(res);
                    });
                });
                // Replace the URL with the rendering result
                $(link).replaceWith(res);
            } catch (err) {
                console.error(
                    `Handel Douban ${doubanType} ID ${doubanId} failed:`,
                    err,
                );
                // If it fails, retain the original link.
                $(link).attr("href", href);
            }
        }
    }
    return $.html();
}

module.exports = replaceDoubanUrls;
