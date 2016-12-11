angular.module('orderCloud')
	.factory('CheckStateChangeService',CheckStateChange);

function CheckStateChange($rootScope) {
	var addCheck = function($scope){
		var removeListener = $rootScope.$on('$stateChangeStart'
			, function (event, toState, toParams, fromState, fromParams) {
				if($scope.form.$pristine) {
					return;
				}
				var canContinue = confirm("The form has change, do you want to continue without saving");
				if(canContinue) {
					return
				}
				event.preventDefault();
			});

		$scope.$on("$destroy", removeListener);
	};

	return { checkFormOnStateChange : addCheck };
}