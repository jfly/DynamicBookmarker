(function() {
    var s = document.createElement('script');
    s.onload = function() {DynamicBookmarker.enter()}; // enter is a function defined in the loaded script
    s.type = 'text/javascript';
    s.src = 'http://jfly.github.com/DynamicBookmarker/DynamicBookmarker.js';
    //TODO - detect failure to load script
    document.body.appendChild(s);
})();
