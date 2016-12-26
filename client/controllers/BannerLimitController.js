(function() {
    'use strict';

    angular
        .module('chartApp')
        .controller('BannerLimitController', BannerLimitController);

    BannerLimitController.$inject = ['$scope', '$http', '$timeout', 'socket', 'appconfig'];

    function BannerLimitController($scope, $http, $timeout, socket, appconfig) {
        // init
        // $scope.output = appconfig;
        // console.log(appconfig);
        $scope.target = {
            apps: appconfig.apps
        };
        $scope.target.selectedApp = $scope.target.apps[0];
        $scope.ruleOptions = ['day', 'lifetime', 'session'];

        var $tbbanner = $('.tbbanner');

        getBanner($scope.target.selectedApp);

        // default action
        function getBanner(app) {
            socket.getBannerShowLimit({ query: { app: app } }, function(result) {
                if (result.err) {
                    console.log(result.err);
                    $scope.rules = [];
                } else {
                    console.log(result.data);
                    $scope.rules = result.data;
                }
            })
        }

        $scope.setSelectedApp = function(app) {
            $scope.target.selectedApp = app;
            getBanner($scope.target.selectedApp);
        }

        $scope.formatDate = function(date) {
            // console.log(date);
            return moment(date).format('LLL');
        }

        $scope.createRule = function() {
            socket.createBannerShowLimit({
                rule: {
                    // ruleNumber: 1,
                    app: $scope.target.selectedApp,
                    rule: 'day',
                    description: '',
                    limit: 1
                }
            }, function(result) {
                if (result.err) {
                    console.log(result.err);
                    // $scope.rules = [];
                } else {
                    console.log(result.data);
                    $scope.rules.push(result.data);

                }
            })
        }

        $scope.deleteRule = function(rule, index) {
            if (window.confirm("Do you really want to delete?")) {
                socket.deleteBannerShowLimit({
                    _id: rule._id,
                    ruleNumber: rule.ruleNumber
                }, function(result) {
                    if (result.err) {
                        console.log(result.err);
                        console.log(result.data);
                        alert(result.err + "\n" + result.data);
                        // $scope.rules = [];
                    } else {
                        console.log(result.data);
                        $scope.rules.splice(index, 1);
                    }

                })
            }
        }

        $scope.saveRule = function(rule) {
            // console.log('save rule')
            // console.log(rule)
            socket.saveBannerShowLimit({
                _id: rule._id,
                data: rule
            }, function(result) {
                if (result.err) {
                    console.log(result.err);
                    alert(result.err);
                    // $scope.rules = [];
                } else {
                    console.log(result.data);
                    alert('success!');
                }
            })
        }

        $scope.reloadRule = function(rule, index) {
            socket.getBannerShowLimit({ query: { _id: rule._id } }, function(result) {
                if (result.err) {
                    console.log(result.err);
                    alert(result.err);
                    // $scope.rules = [];
                } else {
                    $scope.rules[index] = result.data[0];
                    console.log(result.data);
                }
            })
        }

    }

})();
