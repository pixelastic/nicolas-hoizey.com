/* ****************************************************************
 * Statistics
 * ****************************************************************/

 ;(function(win, doc) {

  doc.body.setAttribute('data-viewportwidth', win.viewport_width);
  doc.body.setAttribute('data-screendensity', win.screen_density);

})( window, document );

/* ****************************************************************
 * UX
 * ****************************************************************/

// Add anchor links to titles in the article
(function(w){
  var i,
      list = w.document.querySelectorAll('article.main h2, article.main h3, article.main h4, article.main h5, article.main h6'),
      nb = list.length;

  for (i = 0; i < nb; ++i) {
    if (undefined !== list[i].id) {
      list[i].innerHTML += '&nbsp;<a class="deeplink" href="#' + list[i].id + '"><svg><use xlink:href="#symbol-link" /></svg>&nbsp;<span>lien&nbsp;direct</span></a>';
    } else {
      list[i].innerHTML += '&nbsp;<a class="deeplink" href="#' + i + '"><svg><use xlink:href="#symbol-link" /></svg>&nbsp;<span>lien&nbsp;direct</span></a>';
    }
  }
}(this));

/* ****************************************************************
 * PWA
 * ****************************************************************/

// Install Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Clean Service Worker cache
// https://adactio.com/journal/9888
window.addEventListener('load', function() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({'command': 'trimCaches'});
  }
});

// Deal with offline/online events
// https://www.youtube.com/watch?v=7fnpsF9tMXc
window.addEventListener('offline', function (event) {
  document.body.classList.add('offline');
  // Array.from(document.querySelectorAll('a'))
  //   .forEach(link => {
  //     if (linkIsAvailableOffline(link)) {
  //       link.classList.add('cached');
  //     }
  //   });
});

window.addEventListener('online', function (event) {
  document.body.classList.remove('offline');
});

/* ****************************************************************
 * Search
 * ****************************************************************/

// Utility function to get the search query from the URL query string
// http://stackoverflow.com/a/901144/717195
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var algoliaLinked = false;
var algoliaLoaded = false;
var algoliaClient;
var algoliaIndex;

function onAlgoliaAvailable(callback) {
  if (typeof(algoliasearch) === 'function') {
    algoliaLoaded = true;
    algoliaClient = algoliasearch(algoliaApplicationId, algoliaApiKey);
    algoliaIndex = algoliaClient.initIndex(algoliaIndexName);
    callback();
  } else {
    if (!algoliaLinked) {
      var algoliaScript = window.document.createElement('script');
      algoliaScript.setAttribute('src', '/assets/javascript/vendors/algoliasearchLite-3.24.3.min.js');
      window.document.getElementsByTagName('head')[0].appendChild(algoliaScript);
      algoliaLinked = true;
    }
    setTimeout(function () {
      onAlgoliaAvailable(callback);
    }, 50);
  }
}

var sites = window.document.getElementById('search_sites'),
    button = window.document.getElementById('search_button');

// Make the search form dynamic
sites.parentNode.action = '';

// This hidden field is only for Google fallback when there's no JavaScript
sites.parentNode.removeChild(sites);

// No need to submit when there's JavaScript
button.parentNode.removeChild(button);

var $input = window.document.getElementById('search_input');
var $results = window.document.getElementById('search_results');
var searchSettings = {
      hitsPerPage: 50,
      facets: '*',
      attributesToHighlight: 'title,tags',
      attributesToSnippet: 'content:20'
    };

// A search query may come from the URL query string
var queryString = getParameterByName('q');
if (queryString.length > 0) {
  $input.value = queryString;
  if (queryString.length > 1) {
    onAlgoliaAvailable(function() {
      algoliaIndex.search(queryString, searchSettings, searchCallback);
    })
  }
}

// A search query may come from the user typing in the search field
$input.addEventListener('keyup', function() {
  if ($input.value.length > 1) {
    history.pushState(null, null, '/recherche.html?q=' + $input.value);
    onAlgoliaAvailable(function() {
      algoliaIndex.search($input.value, searchSettings, searchCallback);
    })
  } else {
    history.pushState(null, null, '/recherche.html');
    $results.innerHTML = '';
  }
});

// Search callback function that shows the results
function searchCallback(err, content) {
  if (content.query !== $input.value) {
    // If we receive a result for an old query, abort
    return;
  }

  var months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  $results.innerHTML = '';

  if (err) {
    console.error(err);
    return;
  }

  var resultsNumber = content.hits.length;

  if (resultsNumber === 0) {
    $results.innerHTML = '<p>Aucun résultat, veuillez modifier votre recherche.</p>';
    return;
  }

  $results.innerHTML = '<p class="nb">' + resultsNumber + ' résultat' + (resultsNumber > 1 ? 's' : '');

  var hit, post, post_date, post_tags, post_tags_match;
  for (var i = 0; i < resultsNumber; i++) {
    hit = content.hits[i];

    if (hit.layout == "post") {
      // Build the date to show
      post_date = hit.date;
      post_date = post_date.replace(/^[0-9]{4}-[0-9]{2}-([0-9]{2}).*$/g, "$1").replace(/^0/, "") + " " + months[parseInt(post_date.replace(/^[0-9]{4}-([0-9]{2}).*$/g, "$1"), 10) - 1] + " " + post_date.replace(/^([0-9]{4}).*$/g, "$1");

      // Build the tags list
      post_tags = "";
      post_tags_match = "none";
      for (var j = 0; j < hit._highlightResult.tags.length; j++) {
        post_tags = post_tags + ", " + hit._highlightResult.tags[j].value;
        if (hit._highlightResult.tags[j].matchLevel !== "none") {
          post_tags_match = hit._highlightResult.tags[j].matchLevel;
        }
      }
      post_tags = post_tags.replace(/^, /, "");

      post = "<article class=\"post\"><h2><a href=\"" + hit.url + "\">" + hit._highlightResult.title.value + "</a></h2><header><ul><li class=\"date\"><svg class=\"icon\"><use xlink:href=\"#symbol-date\" /></svg> " + post_date + "</li><li class=\"tags\"><svg class=\"icon\"><use xlink:href=\"#symbol-tags\" /></svg> " + post_tags + "</li></ul></header>" + (hit.text.trim() ? "<p>… " + hit.text + " …</p>" : "") + "</article>";

      $results.innerHTML += post;
    }

    if (hit.layout == "page") {
      page = "<article class=\"post\"><h2><a href=\"" + hit.url + "\">" + hit._highlightResult.title.value + "</a></h2>" + (hit.text.trim() ? "<p>… " + hit.text + " …</p>" : "") + "</article>";

      $results.innerHTML += page;
    }
  }
}
