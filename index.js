var Knex    = require('knex');
var http    = require('http');
var express = require('express');
var app     = express();
var port    = process.env.PORT || 3000;

var NODE_ENV = process.env.NODE_ENV || 'development';

var db = Knex.initialize({
    client: 'mysql',
    connection: {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        user: process.env.MYSQL_USER || 'nixURL',
        password: process.env.MYSQL_PASS,
        database: 'nutritionix_url',
        charset: 'utf8'
    }
});


app.set('trust proxy', true);
app.use(app.router);

// handle errors
app.use(function (err, res, res, next){
    if (!err) {
        return next();
    }

    if (NODE_ENV == 'development') {
        return res.json(err);
    }

    var hasMessage  = err.message;
    var notInternal = err.statusCode != 500;
    var defaultMessage = 'something went wrong';

    res.json({
        error: { message: notInternal && hasMessage ? err.message : defaultMessage },
        params: err.params || void 0,
        statusCode: err.statusCode
    }, err.statusCode);

});


app.get('/:slug', function (req, res, next){

    db('url')
        .select('*')
        .where({slug: req.param('slug')})
        .exec(function(err, data){

            if (err) {
                console.error(err);
                err.statusCode = 500;
                return next(err);
            }

            var url = data && data.length ? data[0] : null;

            if (!url) {
                return next({
                    message: 'no url to match slug',
                    params: { slug: req.param('slug') },
                    statusCode: 404
                });
            }


            var origin = req.headers.origin;
            var xForwardedFor = req.headers['x-forwarded-for'];
            var remoteAddress = req.connection.remoteAddress;
            var ip_address = xForwardedFor || origin || remoteAddress;

            db('click')
                .insert({ url_id: url.id, ip: ip_address })
                .exec(function(err){

                    if (err) {
                        err.statusCode = 500
                        console.error(err);
                        return next(err);
                    }

                    return res.redirect(url.url);
                });

        });

});

app.get('*', function(req, res){
    res.json('record not found', 404);
});

var server = http.createServer(app);

server.listen(port, function(){
    console.log('Nutrition.ly is listening on port %d',port);
});

server.on('error', function (err) {
    console.error(err);
    process.exit(1);
});