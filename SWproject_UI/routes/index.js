var express = require('express');
var router = express.Router();
var fs = require('fs');
var jd = null;
var count=0;
var allBytes=[];
var sum;

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});


client.ping({
  requestTimeout: 1000
}, function (err) {
  if (err) {
    console.trace('elasticsearch cluster is down!');
    //return;
  } else {
    console.log('elasticsearch cluster is on the move');
  }
});

router.get('/', function (req, res, next) {

  client.search({
    index:'logstash-2019.05.11',
    scroll:'2s',
    body: {
        query :{"match_all":{}}
      }
  },function getMore(err,data){
    if(err){
      console.log(err)
      return;
    }
    data.hits.hits.forEach(function(hit) {
          allBytes.push(hit._source.bytes);
    });
    var i;
    sum=0;

    count++;
    if(count < data.hits.total){
      client.scroll({
        scrollId: data._scroll_id,
        scroll: '2s'
      }, getMore);
    }  else{
      for(i=0; i<data.hits.total; i++){
        if(allBytes[i]!=null)sum=sum+parseInt(allBytes[i]);
      }
      console.log(sum);
    }
  });

  res.render('index', { title: 'Express' });
});

router.get('/select', function (req, res, next) {
  res.render('select', { title: 'Express' });
});

router.get('/chartlist', function (req, res, next) {
  res.render('chartlist', { title: 'Express' });
});

// dashboard list
router.get('/list', function (req, res, next) {
  fs.exists('./board_list.json', function (exists) {	// ToDo 목록 존재 확인
    if (exists) {
      fs.readFile('./board_list.json', {
        'encoding': 'utf8'
      }, function (err, list) {	// todo_list.json 파일 읽기
        jd = list;
        console.log(jd);
        res.render('list', { title: 'Express', jdata: jd });
      });
    } else {
      var list = {	// 기본 ToDo 목록 형식
        'list': []
      };

      fs.writeFile('./board_list.json', JSON.stringify(list), function (err) {	// todo_list.json 파일 쓰기
        jd = list;
        console.log(jd);
        res.render('list', { title: 'Express', jdata: jd });
      });
    }
  });
});

// click dashboard
router.get('/list/:idx', function (req, res, next) {
  var idx = req.params.idx;
  console.log("idx: " + idx);

  fs.readFile('./board_list.json', {
    'encoding': 'utf8'
  }, function (err, data) {
    data = JSON.parse(data);
    var cdata = data.list[idx - 1].chart;

    //if chart is null
    if (cdata == "" || cdata == null || cdata == undefined || (cdata != null && typeof cdata == "object" && !Object.keys(cdata).length)) {
      res.render('add_chart', { title: 'Express', idx: idx });
    }
    else {
      console.log('exist');
      res.redirect(idx + '/view');
    }
  });
});

//delete dashboard
router.get('/list/:idx/delete', function (req, res, next) {
  var idx = req.params.idx;
  console.log("delete idx: " + idx);
  fs.readFile('./board_list.json', {
    'encoding': 'utf8'
  }, function (err, data) {
    data = JSON.parse(data);

    console.log(data.list[req.params.idx]);
    data.list[idx - 1] = null;	// 선택한 항목 삭제
    data.list = data.list.filter(Boolean);	// 유효한 값 추려내기

    fs.writeFile('./board_list.json', JSON.stringify(data), function (err) {
      res.redirect('/list');
    });
  });
});

//select chart to add page
router.get('/list/:idx/select', function (req, res, next) {
  var idx = req.params.idx;
  console.log("select idx: " + idx);
  res.render('select', { title: 'Express', idx: idx });
});

//add chart(post)
router.post('/list/:idx/select', function (req, res, next) {
  var idx = req.params.idx;
  var cname = req.body.jbradio;

  var newchart = {	// new chart
    'name': ''
  };

  console.log("post select idx: " + idx);
  newchart.name = cname;

  fs.readFile('./board_list.json', {
    'encoding': 'utf8'
  }, function (err, data) {
    data = JSON.parse(data);
    console.log(data);
    console.log(data.list[idx - 1]);
    console.log(data.list[idx - 1].chart);
    data.list[idx - 1].chart.push(newchart);

    fs.writeFile('./board_list.json', JSON.stringify(data), function (err) {
      res.redirect('view');
    });
  });
});

//view dashboard
router.get('/list/:idx/view', function (req, res, next) {
  var idx = req.params.idx;
  //send data
  fs.readFile('./board_list.json', {
    'encoding': 'utf8'
  }, function (err, list) {   // todo_list.json 파일
    jd = list;
    console.log(jd);
  });

  client.msearch({
    body: [
      { index: 'logstash-2019.04.04' },
      {
        "query": { "match_all": {} }
      },
      { index: 'logstash-2019.04.01' },
      {
        "query": { "match_all": {} }
      },
      { index: 'logstash-2015.05.18' },
      {
        "query": { "match_all": {} }
      },
      { index: 'logstash-2019.05.15' },
      {
        "query": { "match_all": {} }
      }
    ]
  }, function (err, data) {
    var i;
    var number;
    var ctotal = 0;
    for (i = 0; i < 4; i++) {
      number = (data.responses[i].hits.total);
      ctotal = ctotal + number;
    }
    console.log(ctotal);
    res.render('view_dashboard', { title: 'Express', jdata: jd, idx: idx - 1, countlog: ctotal, bytesum: sum});
  });
});

//create dashboard
router.get('/create', function (req, res, next) {
  res.render('create', { title: 'Express' });
});

//create dashboard(post)
router.post('/create', function (req, res, next) {
  console.log("create post");
  var name = req.body.dashname;
  var board = {	// new board
    'name': '',
    'chart': []
  };
  board.name = name;

  fs.readFile('./board_list.json', {
    'encoding': 'utf8'
  }, function (err, data) {
    data = JSON.parse(data);
    data.list.push(board);	// add

    fs.writeFile('./board_list.json', JSON.stringify(data), function (err) {
      res.redirect('/list');
    });
  });
});


//chart pages
router.get("/barChart", function (req, res, next) {
  client.msearch({
    body: [
      {index: 'logstash-2019.05.14'},
      {
        "_source":["daytime","year","month","day"],
        "query":{"match_all":{}}
      },
      {index: 'logstash-2019.05.15'},
      {
        "size": 0, "aggs": { "group_by_day": {
        "terms": { "field": "daydate.keyword"}
        }}
      }
    ]
  },function(err,data){

    var dayLog = [[],[]];
    dayLog[0] = data.responses[1].aggregations.group_by_day.buckets.map(function(obj){
      return obj.key;
    });
    dayLog[1] = data.responses[1].aggregations.group_by_day.buckets.map(function(obj){
      return obj.doc_count;
    });
    console.log(dayLog[0]);
    console.log(dayLog[1]);
    res.render('charts/barChart', {dayLog: dayLog});

  })

});

router.get("/horizontalBar", function (req, res, next) {
  client.msearch({
    body: [
      { index: 'logstash-2019.05.15' },
      {
        "size": 0, "aggs": {
          "group_by_url": {
            "terms": { "field": "uri.keyword" }
          }
        }
      }
    ]
  }, function (err, data) {
    if (err) {
      console.log(err)
      return;
    }
    var url = [[], []];
    url[0] = data.responses[0].aggregations.group_by_url.buckets.map(function (obj) {
      return obj.key;
    });
    url[1] = data.responses[0].aggregations.group_by_url.buckets.map(function (obj) {
      return obj.doc_count;
    });

    res.render('charts/horizontalBar', { url: url });
  });

});
router.get("/pieChart", function (req, res, next) {
  client.msearch({
    body: [
      { index: 'logstash-2019.05.15' },
      {
        "size": 0, "aggs": {
          "group_by_responseCode": {
            "terms": { "field": "responseCode.keyword" }
          }
        }
      }
    ]
  }, function (err, data) {
    if (err) {
      console.log(err)
      return;
    }
    var responseCode = [[], []];
    responseCode[0] = data.responses[0].aggregations.group_by_responseCode.buckets.map(function (obj) {
      return obj.key;
    });
    responseCode[1] = data.responses[0].aggregations.group_by_responseCode.buckets.map(function (obj) {
      return obj.doc_count;
    });
    res.render('charts/pieChart', { responseCode: responseCode });
  });
});

router.get("/donutChart", function (req, res, next) {
  client.msearch({
    body: [
      { index: 'logstash-2019.05.15' },
      {
        "size": 0, "aggs": {
          "group_by_os": {
            "terms": { "field": "os.keyword" }
          }
        }
      }
    ]
  }, function (err, data) {
    if (err) {
      console.log(err)
      return;
    }
    var os = [[], []];
    os[0] = data.responses[0].aggregations.group_by_os.buckets.map(function (obj) {
      return obj.key;
    });
    os[1] = data.responses[0].aggregations.group_by_os.buckets.map(function (obj) {
      return obj.doc_count;
    });

    res.render('charts/donutChart', { os: os });
  });

});

router.get("/mapChart", function (req, res, next) {
  client.msearch({
    body: [
      { index: 'logstash-2019.05.15' },
      {
        "size": 0, "aggs": {
          "group_by_country": {
            "terms": { "field": "geoip.country_name.keyword" }
          }
        }
      }
    ]
  }, function (err, data) {
    if (err) {
      console.log(err)
      return;
    }
    var geoip_list = [[], []];
    geoip_list[0] = data.responses[0].aggregations.group_by_country.buckets.map(function (obj) {
      return obj.key;
    });
    geoip_list[1] = data.responses[0].aggregations.group_by_country.buckets.map(function (obj) {
      return obj.doc_count;
    });
    console.log(geoip_list);
    res.render('charts/mapChart', { col: geoip_list[0], data: geoip_list[1] });
  });
});
router.get("/pieChart3d", function (req, res, next) {
  client.msearch({
    body: [
      { index: 'logstash-2019.05.15' },
      {
        "size": 0, "aggs": {
          "group_by_referrer": {
            "terms": { "field": "referrer.keyword" }
          }
        }
      }
    ]
  }, function (err, data) {
    if (err) {
      console.log(err)
      return;
    }
    var referrer = [[], []];
    referrer[0] = data.responses[0].aggregations.group_by_referrer.buckets.map(function (obj) {
      return obj.key;
    });
    referrer[1] = data.responses[0].aggregations.group_by_referrer.buckets.map(function (obj) {
      return obj.doc_count;
    });

    res.render('charts/pieChart3d', { col: referrer[0], data: referrer[1] });
  });

});

router.get("/lineChart", function (req, res, next) {
  client.msearch({
    body: [
      {index: 'logstash-2019.05.15'},
      {
        "size":0,
        "query":{
          "term":{"responseCode":"404"}
        },"aggs":{
          "daydate":{
            "terms":{"field":"hour.keyword"}
          }
        }
      },
      {index: 'logstash-2019.05.15'},
      {
        "size":0,
        "aggs":{
          "daydate":{
            "terms":{"field":"hour.keyword"}
          }
        }
      }
    ]
  },function(err,data){
    var time = [[],[]];

    time[0] = data.responses[1].aggregations.daydate.buckets.map(function(obj){
      return obj.key;
    });
    time[1] = data.responses[1].aggregations.daydate.buckets.map(function(obj){
      return obj.doc_count;
    });


    res.render('charts/lineChart', {col: time[0], data: time[1]});

  });
});

router.get("/table", function (req, res, next) {
  client.msearch({
    body: [
      { index: 'logstash-2019.04.04' },
      {
        "query": {
          "range": {
            "response": {
              "gte": 400,
              "lte": 499
            }
          }
        }
      },
      { index: 'logstash-2019.04.01' },
      {
        "query": {
          "range": {
            "response": {
              "gte": 400,
              "lte": 499
            }
          }
        }
      },
      { index: 'logstash-2015.05.18' },
      {
        "query": {
          "range": {
            "response": {
              "gte": 400,
              "lte": 499
            }
          }
        }
      },
      { index: 'logstash-2019.05.15' },
      {
        "query": {
          "range": {
            "response": {
              "gte": 400,
              "lte": 499
            }
          }
        }
      }
    ]
  }, function (err, data) {
    var i, j;
    var number;
    var errorlogdata;
    var errorlist=[];

    for (i = 0; i < 5; i++) {
      number = data.responses[i].hits.total;
      if (number == 0)
        break;
      for (j = 0; j < data.responses[i].hits.total; j++) {
        errorlogdata = data.responses[i].hits.hits[j];
        if (errorlogdata == null)
          break;
        errorlogdata = data.responses[i].hits.hits[j]._source.message;
        //console.log(errorlogdata);
        errorlist.push(errorlogdata);
      }
     // console.log(errorlist);
    }
    res.render('charts/table', { errorlist: errorlist });

  });
});

router.get('/developer', function (req, res, next) {
  res.render('developer', { title: 'Express' });
});

router.get('/sponsor', function (req, res, next) {
  res.render('sponsor', { title: 'Express' });
});

router.get('/chart', function (req, res, next) {
  res.render('chart', { title: 'Express' });
});
module.exports = router;
