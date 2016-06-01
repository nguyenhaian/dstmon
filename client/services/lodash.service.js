(function () {
    'use strict';

    angular
        .module('chartApp')
		.factory('_', _);

	_.$inject = ['$window'];
	function _($window) {	
		return $window._;
	}
})();
