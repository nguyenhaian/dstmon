var app = angular.module('chartApp', ['ngTouch', 'rgkevin.datetimeRangePicker', 'ui.bootstrap', 'ui.router']);

app.config(function($stateProvider, $urlRouterProvider) {
    //
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise("/home/tracker");
    //
    // Now set up the states
    $stateProvider
        .state('home', {
            url: "/home",
            templateUrl: "views/home.html",
        })
        .state('home.tracker', {
            url: "/tracker",
            templateUrl: "views/home.tracker.html",
            controller: "CMonController"
        })
        .state('home.notifier', {
            url: "/notifier",
            templateUrl: "views/home.notifier.html",
            controller: "NotificationController"
        })
        .state('home.grettingPopup', {
            url: "/grettingPopup",
            templateUrl: "views/home.gpopup.html",
            controller: "GPopupController"
        })
        .state('home.banner', {
            url: "/banner",
            templateUrl: "views/home.banner.html",
            controller: "BannerController"
        })
        .state('home.bannerv2', {
            url: "/bannerv2",
            templateUrl: "views/home.bannerv2.html",
            controller: "BannerController"
        })
        .state('login', {
            url: "/login",
            templateUrl: "views/login.html"
        })
});
