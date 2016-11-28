(function() {
    'use strict';

    angular
        .module('chartApp')
        .factory('socket', ['d3s', '$rootScope', '$location', '$http', function(d3s, $rootScope, $location, $http) {
            var absUrl = $location.absUrl();
            var indexofsharp = absUrl.indexOf('#');
            if (indexofsharp > 0) {
                absUrl = absUrl.substring(0, indexofsharp);
            }
            var startLoadingTime = null;
            // var url = 'http://203.162.121.174:3003/tracker';
            var url = absUrl + 'tracker';
            console.log('absUrl: ' + absUrl)
            var socket = io(url, { transports: ['websocket'] });
            var appconfig = {};

            $http.get('../../server/config.params.json').success(function(data) {
                appconfig.liveapp = data.liveapp;
            });

            var getTimeStamp = function() {
                return moment().format("YYYY-MM-DD HH:mm:ss.SSS");
            }

            function timelineData(option, onSuccess) { // {oncache:false, limit, from, to}
                console.log(getTimeStamp() + " ----> request timeline data: " + JSON.stringify(option));
                // socket.emit("tk.timelineData", option); // tk: tracker
                $http.post('/timelineData', option, {}).then(function successCallBack(response) {
                    if (response.data.error != null) {
                        alert(response.data.error)
                    }
                    var samplestep = 30 * 1;
                    if (response.data.samplestep) {
                        samplestep = response.data.samplestep;
                    }

                    var jsondata = response.data.timelineData;
                    console.log(getTimeStamp() + " <---- response timeline data: " + jsondata.length);
                    var duration = moment.duration(moment().diff(startLoadingTime)).asSeconds();
                    $rootScope.$broadcast('tld.response', {
                        status: 'done',
                        duration: duration
                    });
                    onSuccess(jsondata, samplestep);
                }, function errorCallback(error) {
                    console.log(getTimeStamp() + " <---- response timeline error: " + error);
                    $rootScope.$broadcast('tld.response', {
                        status: 'error',
                        error: error,
                        duration: duration
                    });
                });
                startLoadingTime = moment();
            }

            function loginData(option, onSuccess) { // {oncache:false, limit, from, to}
                console.log(getTimeStamp() + " ----> request loginData data: " + JSON.stringify(option));
                // socket.emit("tk.loginData", option); // tk: tracker
                $http.post('/loginData', option, {}).then(function successCallBack(response) {
                    if (response.data.error != null) {
                        alert('loginData ' + JSON.stringify(response.data.error));
                    }

                    var jsondata = response.data.loginData;
                    console.log(getTimeStamp() + " <---- response loginData data: " + jsondata.length);
                    var duration = moment.duration(moment().diff(startLoadingTime)).asSeconds();
                    $rootScope.$broadcast('tld.response', {
                        status: 'done',
                        duration: duration
                    });
                    onSuccess(jsondata);
                }, function errorCallback(error) {
                    console.log(getTimeStamp() + " <---- response loginData error: " + error);
                    $rootScope.$broadcast('tld.response', {
                        status: 'error',
                        error: error,
                        duration: duration
                    });
                });
                startLoadingTime = moment();
            }

            function xpost(url, option, onSuccess) {
                console.log(getTimeStamp() + " ----> xpost url: " + url);
                console.log(getTimeStamp() + " ----> xpost data: " + JSON.stringify(option));
                // socket.emit("tk.loginData", option); // tk: tracker
                $http.post(url, option, {}).then(function successCallBack(response) {
                    if (response.data.error != null) {
                        alert('xpost data ' + JSON.stringify(response.data.error));
                    }

                    var jsondata = response.data;
                    console.log(getTimeStamp() + " <---- response xpost data");
                    var duration = moment.duration(moment().diff(startLoadingTime)).asSeconds();
                    $rootScope.$broadcast('response', {
                        status: 'done',
                        duration: duration
                    });
                    onSuccess(jsondata);
                }, function errorCallback(error) {
                    console.log(getTimeStamp() + " <---- response xpost error: " + error);
                    $rootScope.$broadcast('response', {
                        status: 'error',
                        error: error,
                        duration: duration
                    });
                });
                startLoadingTime = moment();
            }

            socket.on("mobile_reginfo", function(data) {
                console.log("<---- mobile_reginfo ");
            });

            socket.on("mobile_changeScene", function(data) {
                console.log("<---- mobile_changeScene");
            });

            socket.on("mobile_disconnect", function(data) {
                console.log("<---- mobile_disconnect");
                // $scope.signals.push(JSON.stringify(data));

                // console.log("<---- signals " + $scope.signals.length);
                // $rootScope.$apply(function () {
                //  // callback.apply(socket, args);
                // });
            });

            socket.on('tld.response', function(jsondata) {
                console.log(getTimeStamp() + " <---- response timeline data: " + jsondata.length);
                var duration = moment.duration(moment().diff(startLoadingTime)).asSeconds();
                $rootScope.$broadcast('tld.response', {
                    status: 'done',
                    duration: duration
                });
                d3s.fillTimeLineData(jsondata);
            });

            socket.on('tld.response.error', function(error) {
                console.log(getTimeStamp() + " <---- response timeline error: " + error);
                $rootScope.$broadcast('tld.response', {
                    status: 'error',
                    error: error,
                    duration: duration
                });
            });

            // deprecated
            socket.on('dist.response', function(jsondata) {
                console.log(getTimeStamp() + " <---- response dist data: " + _.size(jsondata.data));
                if (!jsondata.status) {
                    console.log('dist.response false');
                    return;
                }

                d3s.setDist(jsondata.data);
                // loginData({ oncache: true, limit: 72 });
            });

            return {
                reg: function(onSuccess) {
                    console.log(getTimeStamp() + " ----> reg");
                    // socket.emit("tk.on", { realtime: false });
                    var option = { realtime: false };
                    $http.post('/tkgetdist', option, {}).then(function successCallBack(response) {
                        if (!response.data.status) {
                            console.log('dist.response false');
                            return;
                        }
                        var jsondata = response.data.data;
                        console.log(getTimeStamp() + " <---- response dist data: " + _.size(jsondata));
                        onSuccess(jsondata);
                    }, function errorCallback(error) {
                        console.log(error);
                    });
                },
                // getDist: function() { // TODO: chua truyen vao alreadyHaveList
                //     console.log(getTimeStamp() + " ----> getDist");
                //     // socket.emit("tk.getdist");
                //     $http.post('/dist', [], {}).then(function successCallBack(response) {
                //         var jsondata = response.data.data;
                //         console.log(getTimeStamp() + " <---- response dist data: " + _.size(jsondata.data));
                //         if (!jsondata.status) {
                //             console.log('dist.response false');
                //             return;
                //         }

                //         d3s.setDist(jsondata.data);
                //     }, function errorCallback(error) {
                //         console.log(error);
                //     });
                // },
                timelineData: timelineData,
                loginData: loginData,
                getGP: function(option, onSuccess) {
                    xpost('/getGP', option, onSuccess);
                },
                saveGP: function(option, onSuccess) {
                    xpost('/saveGP', option, onSuccess);
                },
                createGP: function(option, onSuccess) {
                    xpost('/createGP', option, onSuccess);
                },
                deleteGP: function(option, onSuccess) {
                    xpost('/deleteGP', option, onSuccess);
                },
                getBanner: function(option, onSuccess) {
                    xpost('/getBanner', option, onSuccess);
                },
                saveBanner: function(option, onSuccess) {
                    xpost('/saveBanner', option, onSuccess);
                },
                createBanner: function(option, onSuccess) {
                    xpost('/createBanner', option, onSuccess);
                },
                deleteBanner: function(option, onSuccess) {
                    xpost('/deleteBanner', option, onSuccess);
                },
                sendTestBanner: function(option, onSuccess) {
                    xpost(appconfig.liveapp+'/testevent', option, onSuccess);
                }
            };
        }]);
})();
