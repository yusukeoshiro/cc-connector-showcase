'use strict';
var $cache = {};
function initializeCache() {
	$cache.window = $(window);
	$cache.wrapper = $("#wrapper");
	$cache.header = $(".js-fixed-header");
	$cache.search = $(".desktop-search");
	$cache.searchQuery = $("#q");
	$cache.customToggle = $(".toggle, .refinement-header");
	$cache.fakeSearchSubmit = $(".js-fake-search-submit");
	$cache.fakeSearchField = $(".js-fake-search-field");
}
function initializeEvents() {
	var headerHeight =$cache.header.outerHeight(),
		queryVal = $cache.searchQuery.val();
	$cache.window.scroll(function() {
		$cache.wrapper.toggleClass("sticky-header", $(this).scrollTop() > headerHeight );
	});

	$cache.search.on("click", "button", function(e) {
		if ($cache.searchQuery.val() === queryVal || $cache.searchQuery.val() === "") {
			e.preventDefault();
			$cache.search.toggleClass("active");
		}
	});
	$cache.window.on("click", function(e) {
		if (!$(e.target).closest($cache.search).length) {
			$cache.search.removeClass("active");
		}
	});
	$cache.customToggle.on("click", function(){
		$(this).toggleClass("nto-expanded");
	});
	$cache.fakeSearchSubmit.on("click",function(){
		if($cache.fakeSearchField.val() !== "") {
			$cache.searchQuery.val($cache.fakeSearchField.val());
			$cache.search.find("form").submit();
		}
	});
}

// initialize app
$(document).ready(function () {
	initializeCache();
	initializeEvents();
});
