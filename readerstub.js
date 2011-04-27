(function() {
    var s = document.createElement('script');
    s.onload = function() {DynamicBookmarker.enter()}; // enter is a function defined in the loaded script
    s.type = 'text/javascript';
    //s.src = 'reader.js?'+Date.now();
    s.src = 'http://dl.dropbox.com/u/1463845/unhosted/reader.js';
    //TODO - detect failure to load script
    document.body.appendChild(s);
})();
