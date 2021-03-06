angular.module('orderCloud', [
	'ngCookies',
    'ngSanitize',
    'ngAnimate',
    'ngMessages',
	'ngResource',
    'ngTouch',
    'snap',
    'ui.tree',
    'ui.router',
    'ui.bootstrap',
    'ordercloud-angular-sdk',
    'LocalForageModule',
    'toastr',
    'cgBusy',
    'jcs-autoValidate',
    'ordercloud-infinite-scroll',
    'ordercloud-buyer-select',
    'ordercloud-search',
    'ordercloud-assignment-helpers',
    'ordercloud-paging-helpers',
    'ordercloud-auto-id',
    'ordercloud-current-order',
    'ordercloud-address',
    'ordercloud-lineitems',
    'ordercloud-geography',
    'ngCsv',
    'ngFileSaver'
    ])
    .run(InitGA)
    .config(Routing)
    .config(ErrorHandling)
    .config(Interceptor)
    .controller('AppCtrl', AppCtrl)
    .config(DatePickerConfig)
    .directive('ngEnter', NgEnter)
;

InitGA.$inject = ['$rootScope', '$location', '$window'];
function InitGA($rootScope, $location, $window) {
    // initialize Google Analytics
    ga('create', 'UA-88345453-1', 'auto');
    // track pageview on state change
    $rootScope.$on('$stateChangeSuccess', function (event) {
        $window.ga('send', 'pageview', $location.path());
    });
}

function DatePickerConfig(uibDatepickerConfig, uibDatepickerPopupConfig){
    uibDatepickerConfig.showWeeks = false;
    uibDatepickerPopupConfig.showButtonBar = false;
}

function Routing($urlRouterProvider, $urlMatcherFactoryProvider, $locationProvider) {
    $urlMatcherFactoryProvider.strictMode(false);
    $urlRouterProvider.otherwise('/home');
    $locationProvider.html5Mode(true);
}

function ErrorHandling($provide, $qProvider) {
    $qProvider.errorOnUnhandledRejections(false);
    $provide.decorator('$exceptionHandler', handler);

    function handler($delegate, $injector) {
        return function(ex, cause) {
            $delegate(ex, cause);
            $injector.get('toastr').error(ex.data ? (ex.data.error || (ex.data.Errors ? ex.data.Errors[0].Message : ex.data)) : ex.message, 'Error');
        };
    }
}

function AppCtrl($q, $rootScope, $state, $ocMedia, toastr, LoginService, appname, anonymous) {
    var vm = this;
    vm.name = appname;
    vm.title = appname;
    vm.$state = $state;
    vm.$ocMedia = $ocMedia;
    vm.contentLoading = undefined;

    function cleanLoadingIndicators() {
        if (vm.contentLoading && vm.contentLoading.promise && !vm.contentLoading.promise.$cgBusyFulfilled) vm.contentLoading.resolve(); //resolve leftover loading promises
    }

    //Detect if the app was loaded on a touch device with relatively good certainty
    //http://stackoverflow.com/a/6262682
    vm.isTouchDevice = (function() {
        var el = document.createElement('div');
        el.setAttribute('ongesturestart', 'return;'); // or try "ontouchstart"
        return typeof el.ongesturestart === "function";
    })();

    vm.logout = function() {
        LoginService.Logout();
    };

    $rootScope.$on('$stateChangeStart', function(e, toState) {
        cleanLoadingIndicators();
        var defer = $q.defer();
        //defer.delay = 200;
        defer.wrapperClass = 'indicator-container';
        (toState.data && toState.data.loadingMessage) ? defer.message = toState.data.loadingMessage : defer.message = null;
        defer.templateUrl = 'common/loading-indicators/templates/view.loading.tpl.html';
        vm.contentLoading = defer;
    });

    $rootScope.$on('$stateChangeSuccess', function(e, toState) {
        cleanLoadingIndicators();
        if (toState.data && toState.data.componentName) {
            vm.title = toState.data.componentName + ' | ' + appname;
        } else {
            vm.title = appname;
        }
    });

    $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
        cleanLoadingIndicators();
        console.log(error);
    });

    $rootScope.$on('OC:AccessInvalidOrExpired', function() {
        if (!anonymous) LoginService.RememberMe();
    });

    $rootScope.$on('OC:AccessForbidden', function(){
        toastr.warning("You do not have permission to access this page.");
    });
}

function Interceptor($httpProvider) {
    $httpProvider.interceptors.push(function($q, $rootScope) {
        return {
            'responseError': function(rejection) {
                if (rejection.config.url.indexOf('ordercloud.io') > -1 && rejection.status == 401) {
                    $rootScope.$broadcast('OC:AccessInvalidOrExpired');
                }
                if (rejection.config.url.indexOf('ordercloud.io') > -1 && rejection.status == 403){
                    $rootScope.$broadcast('OC:AccessForbidden');
                }
                return $q.reject(rejection);
            }
        };
    });
}

/*
This directive allows us to pass a function in on an enter key to do what we want.
 */
function NgEnter() {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
}