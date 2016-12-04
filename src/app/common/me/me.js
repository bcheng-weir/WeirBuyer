angular.module('orderCloud')
	.factory('Me',Me);

function Me() {
	var service = {
		Profile: null,
		Org: null
	};

	return service;
}