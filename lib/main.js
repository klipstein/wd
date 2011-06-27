var http = require("http");

var strip = function strip(str) {
	var x = [];
	for(var i in str) {
		if (str.charCodeAt(i)) {
			x.push(str.charAt(i));
		}
	}
	return x.join('');
}

var webdriver = function(host, port, username, accessKey, basePath) {
  this.sessionID = null;
  this.options = {
    host: host || '127.0.0.1'
    , port: port || 4444
    , path: basePath || '/wd/hub/session'
    , method: 'POST'
  };  
  this.desiredCapabilities = {
    browserName: "firefox"
    , version: ""
    , javascriptEnabled: true
    , platform: "ANY",
  }
  
  if (username && accessKey) {
    var authString = username+":"+accessKey;
    var buf = new Buffer(authString);
    this.options['headers'] = {
      'Authorization': 'Basic '+ buf.toString('base64')
    }
    this.desiredCapabilities.platform = "VISTA";
  }
  
  this.getOpts = function(over) {
    var opt = new Object();
    for (o in this.options) {
      opt[o] = this.options[o];
    }
    opt['path'] += '/'+this.sessionID;
    if (over.url) {
      opt['path'] += over.url;
    }
    if (over.method) {
      opt['method'] = over.method;
    }
    if (over.data != undefined && typeof over.data == 'string') {
      if(!opt.headers) opt.headers = {}; 
      opt.headers['Content-Length'] = over.data.length;
    }
    return opt;
  }
};

webdriver.prototype.init = function(desired, cb) {
  var _this = this;
  
  //allow desired ovveride to be left out
  if (typeof desired == "function") {
    cb = desired;
    desired = null;
  }
    
  if (desired && desired.browserName) {
    this.desiredCapabilities.browserName = desired.browserName;
  }
  if (desired && desired.version) {
    this.desiredCapabilities.version = desired.version;
  }
  if (desired && desired.javascriptEnabled) {
    this.desiredCapabilities.javascriptEnabled = desired.javascriptEnabled;
  }
  if (desired && desired.platform) {
    this.desiredCapabilities.platform = desired.platform;
  }
  if (desired && desired.name) {
    this.desiredCapabilities.name = desired.name;
  }

  var body = JSON.stringify({desiredCapabilities: _this.desiredCapabilities});
  this.options.headers = {
    'Content-Length': body.length
  }

  var req = http.request(_this.options, function(res) {
    res.on('end', function() {
      if (res.headers.location == undefined) {
        console.log("\x1b[31mError\x1b[0m: The environment you requested was unavailable.\n");
        console.log("For the available values please consult the WebDriver JSONWireProtocol,");
        console.log("located at: \x1b[33mhttp://code.google.com/p/selenium/wiki/JsonWireProtocol#/session\x1b[0m");
        return;
      }
      var locationArr = res.headers.location.split("/")
      _this.sessionID = locationArr[locationArr.length - 1];
      if (cb) { cb(_this.sessionID) }
    });
  });
  req.write(body);
  req.end();
};

webdriver.prototype.close = function(cb) {
  var _this = this;
  var req = http.request(
    _this.getOpts(
      {url:'/window', method:'DELETE', data:""}
    ), function(res) {
      if (cb){ cb(); }
    });
  
  req.write("");
  req.end();
}

webdriver.prototype.quit = function(cb) {
  var _this = this;
  var req = http.request(
    _this.getOpts(
      {method:'DELETE', data:""}
    ), function(res) {
      if (cb){ cb(); }
    });
  
  req.write("");
  req.end();
}

webdriver.prototype.exec = function(code, cb) {
  var _this = this;
  var body = JSON.stringify({script:"return "+code, args:[]});
  
  var req = http.request(  
    _this.getOpts({url:'/execute', data:body}), function(res) {
      res.setEncoding('utf8');
      
      var data = "";
      res.on('data', function(chunk) { data += chunk.toString(); });
      res.on('end', function() {
        if (cb){ cb(JSON.parse(strip(data)).value); }
      });
  });
  
  req.write(body);
  req.end();
};

webdriver.prototype.execute = function(code, cb) {
  var _this = this;
  var body = JSON.stringify({script:code, args:[]});
  
  var req = http.request(  
    _this.getOpts({url:'/execute', data:body}), function(res) {
      res.setEncoding('utf8');
      
      var data = "";
      res.on('data', function(chunk) { data += chunk.toString(); });
      res.on('end', function() {
        if (cb){ cb(JSON.parse(strip(data)).value); }
      });
  });
  
  req.write(body);
  req.end();
};


webdriver.prototype.get = function(url, cb) {
  var _this = this;
  var body = JSON.stringify({"url":url});
  
  var req = http.request(
    _this.getOpts({url:'/url', data:body}), function(res) {
      if (cb){ cb(); }
  });
  
  req.write(body);
  req.end();
};

exports.remote = function(host, port, username, accessKey, basePath) {
  return new webdriver(host, port, username, accessKey, basePath);
}
