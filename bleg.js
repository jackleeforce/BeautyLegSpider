var colors = require('colors');
colors.setTheme({
    silly: 'rainbow',
    info: 'green',
    error: 'red',
    help: 'cyan',
    data: 'blue'
});
var node = {
    async: require('async'),
    cheerio: require('cheerio'),
    fs: require('fs'),
    mkdirp: require('mkdirp'),
    path: require('path'),
    request: require('request'),
    // request: require('request').defaults({proxy: 'http://proxy.tencent.com:8080'}),
    url: require('url')
};
var Spider = {
    options: {
        uri: 'http://www.meitulu.com/item/', // 111.html
        saveTo: './blegImg',
        startPage: 8315,
        //endPage: endPage, // 8581 -1-16
        downLimit: 2
    },
    posts: [],
    start() {
        this.options.endPage = this.options.startPage + 0 ;
        var async = node.async;
        var time_s = + new Date();
        async.waterfall([
            this.getPages.bind(this),
            // this.downAllImages.bind(this)
        ], (err, result) => {
            if (err) {
                console.log('error: %s'.error, err.message);
            } else {
                console.log('success! , used %d s .'.info, (+new Date - time_s)/1000 );
            }
        });
    },
    /**
     * 爬取所有页面
     */
    getPages(callback) {
        var async = node.async;
        var i = this.options.startPage || 1;
        async.doWhilst((callback) => {
            var uri = this.options.uri +  i + '.html';
            async.waterfall([
                this.downPage.bind(this, uri, i),
                this.parsePage.bind(this),
                this.downAllImages.bind(this) 
            ], callback);
            i++;
            //todo 这里是如果拿到page参数的？waterfall的callack会隐式传递前几步的参数？
        }, (page) => this.options.endPage > page, callback);
    },
    /**
     * 下载单个页面
     */
    childCurPage:1,
    childMaxPage: null,
    childPosts: [],
    downPage(uri, curpage, callback) {
        console.log('Get Page：%s', uri);
        var options = {
            url: uri,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.54 Safari/537.36',
                'Cookie': 'lang_set=zh;'
            }
        };
        var self = this;
        // 获取单个item的页面总数,然后爬取每个页面，抓取每个页面中的src
        node.request(options, (err, res, body) => {
            if (!err) console.log('Get Page OK：%s'.info, uri);
            
            self.childPosts.push(body);
            if (!self.childMaxPage) {
                var $ = node.cheerio.load(body);
                var pages_a = $('#pages a');
                self.childMaxPage = $(pages_a[pages_a.length - 2]).html() ;
                console.log('Child Page %d'.help, self.childMaxPage);
            }
            if (self.childCurPage < self.childMaxPage) {
                self.childCurPage++;
                self.downPage(self.options.uri + curpage + '_' + self.childCurPage + '.html', curpage, callback);
            }else {
                self.childCurPage = 1 ;
                self.childMaxPage = null; 
                console.log('Got all child page，已重设递归参数'.help);
                var page = {
                    page: curpage,
                    uri: uri,
                    html: self.childPosts
                };
                self.childPosts = [] ;
                callback(err, page);
            }

        });
    },
    /**
     * 解析单个页面并获取数据
     */
    parsePage(page, callback) {
        console.log('Start Parse Data：%s'.help , page.uri);
        var self = this;
        var src = [] ;
        page.html.forEach((v,k)=>{
            var $ = node.cheerio.load(v);
            var $posts = $('center img');
            $posts.each(function() {
                var href = $(this).attr('src') ;
                src.push(href)
            });
        });
        self.posts.push({
            loc: src,
            title: "page" + page.page,
            page: page.page
        });
        console.log('Parsed OK，%d images'.info, src.length);
        callback(null, page.page);
    },
    /**
     * 下载全部图片
     */
    downAllImages(page, callback) {
        //todo
        var async = node.async;
        console.log('Start download All ，%d folder', this.posts.length);
        async.eachSeries(this.posts, this.downPostImages.bind(this), (a,b)=>{
            this.posts = [] ;
            console.log('Ready to Get Next Group'.help);
            callback(null, page)
        });
    },
    /**
     * 下载单个页面的图片
     * @param  {Object} post
     */
    downPostImages(post, callback) {
        var async = node.async;
        async.waterfall([
            this.mkdir.bind(this, post),
            this.downImages.bind(this),
        ], callback);
    },
    /**
     * 创建目录
     */
    mkdir(post, callback) {
        var path = node.path;
        post.dir = path.join(this.options.saveTo, post.title);
        console.log('Start create dir：%s'.help , post.dir);
        if (node.fs.existsSync(post.dir)) {
            console.log('Exist Dir：%s '.info, post.dir);
            callback(null, post);
            return;
        }
        node.mkdirp(post.dir, function(err) {
            console.log('Dir create OK：%s '.info, post.dir);
            callback(err, post);
        });
    },
    /**
     * 下载post图片列表中的图片
     */
    downImages(post, callback) {
        console.log('Start download %d images', post.loc.length);
        node.async.eachLimit(post.loc, this.options.downLimit, this.downImage.bind(this, post), callback);
    },
    /**
     * 下载单个图片
     */
    downImage(post, imgsrc, callback) {
        var url = node.url.parse(imgsrc);
        var fileName = node.path.basename(url.pathname);
        var toPath = node.path.join(post.dir, fileName);
        console.log('Start download single img：%s，保存到：%s'.help, fileName, post.dir);
        node.request(encodeURI(imgsrc)).pipe(node.fs.createWriteStream(toPath)).on('close', () => {
            console.log('download OK：%s'.info, imgsrc);
            //触发接下来的循环
            callback();
        }).on('error', callback);
    }
};
Spider.start();
