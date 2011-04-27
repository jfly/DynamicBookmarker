(function() {
// copied from painlessjson
var PainlessJson = function(url) {
    // copied from tnoodletimer
    tnoodle = {};
    tnoodle.jsonpcount = 1;
    tnoodle.jsonp = function(callback, url, data) {
        var callbackname = 'tnoodle.jsonp.callback' + this.jsonpcount++;
        eval(callbackname + '=callback');
        if (url.indexOf('?') > -1) {
            url += '&callback=';
        } else {
            url += '?callback=';
        }

        url += callbackname + '&' + tnoodle.toQueryString(data);
        url += '&' + new Date().getTime().toString(); // prevent caching

        var script = document.createElement('script');
        script.setAttribute('src',url);
        script.setAttribute('type','text/javascript');
        document.body.appendChild(script); //TODO - doesn't work until body is loaded
    };
    tnoodle.toQueryString = function(data) {
        var url = '';
        for(var key in data) {
            if(data.hasOwnProperty(key)) {
                url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
            }
        }
        if(url.length === 0) {
            return url;
        }

        return url.substring(1);
    };

    url = url || 'http://jfly.algnex.us/painlessjson/painlessjson.py';
	this.getJsonLink = function(user, app) {
		return url + "?" + tnoodle.toQueryString({user: user, domain: app});
	};
    this.get = function(user, app, callback) {
        data = {
            user: user,
            domain: app
        };
        var oldcallback = callback;
        callback = function(data) {
            try {
                data.value = JSON.parse(data.value);
            } catch(err) {
                data.value = null;
            }
            oldcallback(data);
        };
        tnoodle.jsonp(callback, url, data);
    };
    this.put = function(user, app, value, callback) {
        data = {
            user: user,
            domain: app,
            value: JSON.stringify(value)
        };
        tnoodle.jsonp(callback, url, data);
    };
};

function empty(el) {
    if(el.hasChildNodes()) {
        while(el.childNodes.length >= 1) {
            el.removeChild(el.firstChild);
        } 
    }
}
function createLink(url, txt) {
	var link = document.createElement('a');
	link.style.color = 'black';
	link.style['font-family'] = 'sans-serif';
	link.style['font-variant'] = 'normal';
	link.style['font-size'] = '14px';
	link.style['font-weight'] = '800';
	link.href = url;
	link.title = url;
	link.appendChild(document.createTextNode(txt));
	return link;
}
function assert(expr, string) {
	if(!expr) {
		//TODO - traceback would be damn nice
		if(console.log) {
			console.log(string);
		}
		alert(string);
	}
}
function getDesiredUrl() {
	return document.location.hash.substring(1) || document.location.href;
}
function exit() {
	document.location.href = getDesiredUrl();
}

// Handle reclick of bookmarklet
if(typeof(DynamicBookmarker) != 'undefined' && DynamicBookmarker.enter) {
    if(confirm("DynamicBookmarker.enter already defined, breaking out of iframe to " + getDesiredUrl())) {
		exit();
    }
    return;
}

var painless = new PainlessJson();
var app = 'DynamicBookmarker';
var domain = document.location.host;
var hostsMap = null, username = null;
var iframe = null, bar = null;

DynamicBookmarker = {};
DynamicBookmarker.enter = function() {
	createIframeBar();

    tnoodle.jsonp(function(data) {
		username = data.value || null;
		if(username !== null) {
			loadBookmarks();
		}
		bar.refresh();
    }, 'http://jfly.algnex.us/painlessjson/painlesscookies.py');

};

function loadBookmarks() {
	// TODO - check if user went off and read on a diff computer
	// TODO - some way to refresh, get url
	painless.get(username, app, function(data) {
		assert(data.success, 'error loading bookmarks ' + username + " " + app);
		hostsMap = data.value;
		// copied from updateBookmark
		if(typeof(hostsMap) != "object" || !hostsMap) {
			hostsMap = {};
		}
		if(!hostsMap[domain]) {
			// no need to save this here, as it will get saved one the
			// iframe finishes loading it
			hostsMap[domain] = document.location.href;
		}
		bar.refresh();
		iframe.contentWindow.location.href = hostsMap[domain].split('#')[0];
	});
}
function updateBookmark(host, newUrl) {
	// this is a little tricky
	// if 2 tabs are using DynamicBookmarker, then they'll quickly get out of
	// sync with one another
	// to avoid stomping all over a different host's bookmark, we need to first
	// load the latest bookmarks before saving
	// i'm sure this is a terribly racy solution, but it doesn't really matter
	painless.get(username, app, function(data) {
		assert(data.success, 'error loading bookmarks2 for ' + username + " " + app);
		var oldUrl = hostsMap[host];
		assert(oldUrl, 'host' + host + 'not found in hostsMap');
		hostsMap = data.value;
		// copied from loadBookmarks
		if(typeof(hostsMap) != "object" || !hostsMap) {
			hostsMap = {};
		}
		if(host in hostsMap && hostsMap[host] != oldUrl) {
			if(!confirm('The url stored for ' + host + ' was ' + hostsMap[host] + ', we expected ' + oldUrl + '\n'+
					    'Click ok to proceed with storing ' + newUrl + ' for ' + host)) {
				return;
			}
		}
		painless.put(username, app, hostsMap, function(data) {
			assert(data.success, 'error saving bookmarks2');

			if(newUrl) {
				hostsMap[host] = newUrl;
			} else {
				delete hostsMap[host];
				if(host == domain) {
					exit();
				}
			}
			bar.refresh(); // update hosts in bar
		});
	});
}

function createIframeBar() {
    empty(document.body);
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    //TODO - is this really the best way of getting the html node?
    document.getElementsByTagName('html')[0].style.overflow = "hidden";

    bar = document.createElement('div');
    bar.style.postition = 'absolute';
    bar.style.top = '0px';
    bar.style.left = '0px';
    bar.style.height = '18px';
    bar.style.background = 'red';
    bar.style['padding-left'] = '5px';
    bar.style['text-align'] = 'left';
    document.body.appendChild(bar);
	bar.refresh = function() {
		empty(bar);
		//TODO - let this scale nicely
		//TODO - make hosts deleteable?
		if(hostsMap !== null) {
			var hosts = [];
			for(var host in hostsMap) {
				hosts.push(host);
			}
			for(var i = 0; i < hosts.length; i++) {
				var host = hosts[i];
				var hostLink = createLink(hostsMap[host], host);
				bar.appendChild(hostLink);
				var deleteHostLink = createLink('', '(X)');
				bar.appendChild(deleteHostLink);
				deleteHostLink.onclick = (function(host) {
					return function(e) {
						if(host == domain) {
							if(confirm("Are you sure you want to delete the url for " + host + '?\n' +
									   "This will close the DynamicBookmarker toolbar.")) {
								updateBookmark(host, null);
								bar.refresh();
							}
						} else {
							if(confirm("Are you sure you want to delete the url for " + host + '?')) {
								updateBookmark(host, null);
								bar.refresh();
							}
						}
						return false;
					};
				})(host);
				bar.appendChild(document.createTextNode(' '));
			}
		} else {
			var status = (username === null) ? 'Not connected ' : 'Connecting... ';
			bar.appendChild(document.createTextNode(status));
		}

		var loginLink = createLink('', username || 'Sign in');
		loginLink.style.right = '55px';
		loginLink.style.position = 'absolute';
		loginLink.onclick = function(e) {
			var newUsername = prompt("who are you? who who");
			if(newUsername) {
				username = newUsername;
				tnoodle.jsonp(function(data) {
					
				}, 'http://jfly.algnex.us/painlessjson/painlesscookies.py', { value: username });
				loadBookmarks();
				bar.refresh(); // update login link & page list
			}
			return false;
		};
		bar.appendChild(loginLink);
		bar.appendChild(document.createTextNode(' '));

		if(username !== null) {
			var jsonLink = createLink(painless.getJsonLink(username, app), 'json');
			jsonLink.target = '_blank';
			jsonLink.style.right = '20px';
			jsonLink.style.position = 'absolute';
			bar.appendChild(jsonLink);
			bar.appendChild(document.createTextNode(' '));
		}

		var closeLink = createLink('', 'X');
		closeLink.style.right = '5px';
		closeLink.style.position = 'absolute';
		closeLink.onclick = function(e) {
			exit();
			return false;
		};

		bar.appendChild(closeLink);
		bar.appendChild(document.createTextNode(' '));
	};
	bar.refresh();

    iframe = document.createElement('iframe');
    iframe.style.position = "absolute";
    iframe.style.top = "18px";
    iframe.style.left = "0px";
    iframe.style.border = "0";
    iframe.src = document.location.href;
    iframe.onload = function(e) {
        //TODO - recurse through dom and add listeners for every linky?
        var url = iframe.contentWindow.location.href;
        /*iframe.contentWindow.onbeforeunload = function(e) {
            //TODO something clever here?
        };*/
        if(!url) {
            //TODO handle this nicely...
            alert("can't handle leaving the domain: " + domain);
            return;
        }
		if(hostsMap !== null) {
			document.title = '@ - ' + iframe.contentWindow.document.title;
			url = url.split('#')[0];
			document.location.hash = url;
			updateBookmark(domain, url);
		}
		// if a user clicks on a link with a hashtag, it may invoke scrolling of the outer page (not the iframe)
		window.scrollTo(0, 0);
    };
    window.onhashchange = function(e) {
        //TODO - history navigating is screwy
		var url = getDesiredUrl();
        if(iframe.contentWindow.location.href.split('#')[0] != url) {
            iframe.contentWindow.location.href = url;
        }
    };
	window.onresize = function(e) {
		iframe.style.width = window.innerWidth + 'px';
		iframe.style.height = (window.innerHeight-18) + 'px';
		bar.style.width = window.innerWidth + 'px';
	};
	window.onresize();
    document.body.appendChild(iframe);
}

})();
