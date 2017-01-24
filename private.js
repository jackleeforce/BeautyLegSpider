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
    url: require('url')
};
var leftPad = (v, n= 3) => {
    var len = ('' + v).length
    return Array(n+1-len).join('0') + '' + v ;
};
var videoPather = (page, order) => {
    var tag = 'SPE'
    tag = 'PPG'
    return `${Spider.options.uri}${tag}${leftPad(page)}_s0${order}/trailers/${tag}${leftPad(page)}_s0${order}_trailer_01.mp4` ;

}
var Spider = {
    options: {
        //uri: 'http://cdnhw.private.com/content/upload/SPE152_s03/trailers/SPE152_s03_trailer_01.mp4', // 111.html
        uri: 'http://cdnhw.private.com/content/upload/' ,
        saveTo: './privateVideo/',
        startPage: 30,
        //endPage: endPage, // 8581 -1-16
        downLimit: 1
    },
    posts: [],
    start() {
        this.options.endPage = this.options.startPage + 9 ;
        var async = node.async;
        var time_s = + new Date();
        async.waterfall([
            this.getPages.bind(this),
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
            async.waterfall([
                this.parsePage.bind(this, i ),
                this.downAllImages.bind(this) 
            ], callback);
            i++;
        }, (page) => this.options.endPage > page, callback);
    },
    /**
     * 解析单个页面并获取数据
     */
    parsePage(curpage, callback) {
        console.log('start parse') ;
        for (var i = 2, le = 5; i < le; i++ ) {
            this.posts.push( videoPather(curpage, i) )
        }
        console.log('parsed OK') ;
        callback(null, curpage);
    },
    /**
     * 下载全部图片
     */
    downAllImages(page, callback) {
        var async = node.async;
        console.log('Start download Page %d ', page);
        async.eachSeries(this.posts, this.downImages.bind(this), (a,b)=>{
            this.posts = [] ;
            console.log('Ready to Get Next Page: %d'.help, page+1);
            callback(null, page)
        });
    },
    downImages(post, callback) {
        console.log('download single') ;
        var fileName = node.path.basename(post);
        var toPath =  node.path.join(this.options.saveTo, fileName.replace('_trailer_01', ''));
        node.request(encodeURI(post)).pipe(node.fs.createWriteStream(toPath)).on('close', () => {
            console.log('download OK：%s'.info, post);
            callback();
        }).on('error', callback);
    }
};
Spider.start();
