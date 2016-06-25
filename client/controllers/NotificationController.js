(function() {
    'use strict';

    angular
        .module('chartApp')
        .controller('NotificationController', NotificationController);

    NotificationController.$inject = ['$scope', '$http', '$timeout'];

    function NotificationController($scope, $http, $timeout) {
        console.log("init NotificationController");
        $scope.target = {
            groups: [{
                groupname: 'Group Game 3C',
                members: [{ name: 'Game 3C Unity (& Android)', appid: '1f96cdec-1624-11e5-add5-3f9206d46331', key: 'MWY5NmNlNzgtMTYyNC0xMWU1LWFkZDYtNDNlZjEzZTIxZjU2' },
                    { name: 'Game 3C Sâm Lốc', appid: '2c838338-b34e-4c3a-b30f-95b9a2d84208', key: 'ZmNkNTViYTItZWExMC00Yzg2LTg4MGUtZmYxNTQxMTBmYTE5' },
                    { name: 'Game 3C Tiến Lên', appid: '5065f953-5eee-4489-90e6-6ae6230c5860', key: 'NmIxNDg2ZDQtMThmMC00YmU4LTk2MDEtMjcxNWQwNTM2NmE5' },
                    { name: 'Game 3C Xóc Đĩa', appid: '0c13acdd-61c7-433f-85cf-d1256f1c61b6', key: 'ZWU3YzFhY2UtZTkyYy00ZTAzLTkyNzItNzZmMWI1NDhmNzdk' }
                ]
            }, {
                groupname: 'Group 52Fun',
                members: [
                    { name: '52Fun Unity (& Android)', appid: 'a34faff6-4d5a-11e5-bfed-3f96110e57ae', key: 'YTM0ZmIwNmUtNGQ1YS0xMWU1LWJmZWUtYmZlYjY1NWY2Nzk4' },
                    { name: '52Fun Tiến Lên', appid: 'a1d96af6-6799-485f-b27a-3bf5ee4716bc', key: 'NzNhOWEzY2UtYzU0OS00MWQ1LWI0MmMtYjk1OTA1MzFkNDkz' },
                    { name: '52Fun Xóc Đĩa', appid: '0f372644-5bde-43bf-b5e0-15c5f720d6e2', key: 'NTE1YmY2ZGItNzc2NS00NTMzLTgzNzQtZDNhOWJjYTI0MzY3' }
                ]
            }, {
                groupname: 'Group Đấu Trường',
                members: [
                    { name: 'Đấu Trường Unity (& Android)', appid: '05052740-e9a0-11e4-9294-7f1cdb478da5', key: 'MDUwNTI3ZDYtZTlhMC0xMWU0LTkyOTUtNGI2ZDI0NDUzMDcy' },
                    { name: 'Đấu Trường Tiến Lên', appid: '7b7b28de-9db4-4752-800c-9034d4ea79d4', key: 'ZjY0YjhjMzEtNjAyMC00OGRkLWFmNTQtOWQ4OWNlMzdkOTA4' },
                    { name: 'Đấu Trường 2016', appid: 'b1b029c9-81c1-4c78-a80f-091547041204', key: 'NDBmMmRhYzMtNTFhYy00OGI4LTllY2YtYzllNGVkNWMxZjVl' }
                ]
            }, {
                groupname: 'Group Siam Play',
                members: [
                    { name: 'Siam Unity', appid: '4f1d9f21-2646-42aa-807a-d13bacc41c56', key: 'ZjdjOTIwNjctZDFjMS00NTMwLTgxZTUtMmNhM2Q4MDIyYTRj' },
                    { name: 'Siam Hilo', appid: 'e44e3328-2666-44b5-8d95-383b4aacfe8b', key: 'ODE0Y2Q1YzItMzE5NS00MmU5LWE5YjMtZGYzMzA4NGEwNTYz' },
                    { name: 'Siam Dummy (& Android)', appid: '60c4f721-75c6-4f10-b736-3ff480038f61', key: 'Y2IyZDViNTEtMjY3NC00OWU5LTk4ZTQtZDRmZjg3YmE1MzIy' },
                    { name: 'Siam 9K', appid: '3c76eabc-4bdb-44bc-8673-b61e816b6396', key: 'ZTk1OGY5YjEtOTBjNS00OWRjLWE3ZDUtOTUwZGY5ZDNkNThl' }
                ]
            }, {
                groupname: 'Group UWin',
                members: [
                    { name: 'UWin', appid: '5274a4be-a643-4f6a-8241-9612eaab1f46', key: 'YzAxYjAwZmItNTVmMS00YmE4LThmOWYtMmU4NjdlYzk2ZGE4' }
                ]
            }],
            selectedGroup: -1,
            selectedApp: -1,
            one: { username: '', userid: '', title: '', message: '' },
            selected: function() {
                var target = $scope.target;
                if (target.selectedGroup > -1) {
                    var group = target.groups[target.selectedGroup];
                    var GroupName = group.groupname;
                    if (target.selectedApp > -1) {
                        var AppName = group.members[target.selectedApp].name;
                        return GroupName + ' - ' + AppName;
                    } else {
                        return GroupName + ' - *';
                    }
                } else {
                    return 'Select an App';
                }
            },
            getapp: function(appid) {
                for (var i = $scope.target.groups.length - 1; i >= 0; i--) {
                    var group = $scope.target.groups[i];
                    for (var j = group.members.length - 1; j >= 0; j--) {
                        var member = group.members[j];
                        if (member.appid == appid) {
                            return member;
                        }
                    };
                };
                return {};
            },
            getmsgdetail: function(msgid) {
                return msgid;
            },
            getappname: function(appid) {
                return $scope.target.getapp(appid).name || appid;
            }
        };

        $scope.pendingnotifications = [];
        $scope.sentnotifications = [];
        $scope.sentcampaigns = [];

        $scope.sendMultipleTarget = function() {
            var campaign = {
                name: 'notset',
                targetType: 'manually',
                selectedGroup: $scope.target.selectedGroup,
                selectedApp: $scope.target.selectedApp,
                recipients: $scope.pendingnotifications
            }

            $http.post('/notify', campaign, {}).then(function successCallBack(response) {
                console.log(" <---- response data: " + JSON.stringify(response));
                // TODO: xử lý in ra logs
            }, function errorCallback(error) {
                console.log(error);
            });
        };

        $scope.uploadPendingMessage = function() {
            alert('Chức năng đang phát triển');
        };

        $scope.sendSingleTarget = function() {
            var campaign = {
                    name: 'notset',
                    targetType: 'manually',
                    selectedGroup: $scope.target.selectedGroup,
                    selectedApp: $scope.target.selectedApp,
                    recipients: [$scope.target.one]
                }
                // console.log("singleTarget: " + JSON.stringify(singleTarget));
                // $scope.sendOnesignal(singleTarget.name, singleTarget.title, singleTarget.message, 1);

            $http.post('/notify', campaign, {}).then(function successCallBack(response) {
                console.log(" <---- response data: " + JSON.stringify(response));
                // TODO: xử lý in ra logs
            }, function errorCallback(error) {
                console.log(error);
            });
        }

        $scope.updatePendingMessage = function() {
                $http.post('/getPendingMessage', { target: $scope.target.selectedGroup }, {}).then(function successCallBack(response) {
                    if (response.data.err) {
                        console.log(" <---- response data err: " + JSON.stringify(response.data.err));
                        return;
                    }

                    var jsondata = response.data.data;
                    console.log(" <---- response data: " + _.size(jsondata));
                    console.log(" <---- response data[$last]: " + JSON.stringify(jsondata[jsondata.length - 1]));

                    $scope.pendingnotifications = jsondata;
                }, function errorCallback(error) {
                    console.log(error);
                });
            }
            // load data

        $scope.loadLastSentMsg = function() {
            $http.get('/loadLastSentMsg', {}).then(function successCallBack(response) {
                if (response.data.err) {
                    console.log(" <---- response data err: " + JSON.stringify(response.data.err));
                    return;
                }

                var jsondata = response.data.data;
                console.log(" <---- response data: " + _.size(jsondata));
                console.log(" <---- response data[0]: " + JSON.stringify(jsondata[0]));

                $timeout(function() {
                    $scope.sentnotifications = jsondata;
                }, 0);
            }, function errorCallback(error) {
                console.log(error);
            });
        }

        $scope.loadLastSentCampaigns = function() {
            $http.get('/loadLastSentCampaigns', {}).then(function successCallBack(response) {
                if (response.data.err) {
                    console.log(" <---- response data err: " + JSON.stringify(response.data.err));
                    return;
                }

                var jsondata = response.data.data;
                console.log(" <---- response data: " + _.size(jsondata));
                console.log(" <---- response data[0]: " + JSON.stringify(jsondata[0]));

                $timeout(function() {
                    $scope.sentcampaigns = jsondata;
                }, 0);
            }, function errorCallback(error) {
                console.log(error);
            });
        }     

        $scope.loadSentMsgByCampaign = function(campaignid) {
            $http.get('/loadSentMsgByCampaign/'+campaignid, {}).then(function successCallBack(response) {
                if (response.data.err) {
                    console.log(" <---- response data err: " + JSON.stringify(response.data.err));
                    return;
                }

                var jsondata = response.data.data;
                console.log(" <---- response data: " + _.size(jsondata));
                console.log(" <---- response data[0]: " + JSON.stringify(jsondata[0]));

                $timeout(function() {
                    $scope.sentnotifications = jsondata;
                }, 0);
            }, function errorCallback(error) {
                console.log(error);
            });
        }      

        $scope.loadLastSentMsg();
        $scope.loadLastSentCampaigns();
    }

})();
