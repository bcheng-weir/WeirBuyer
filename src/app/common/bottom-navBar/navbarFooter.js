angular.module('orderCloud')
    .config(navConfig)
    .controller('footerCtrl', footerController)
;

function navConfig($stateProvider) {
    $stateProvider
        .state('terms-of-use', {
            url: '/termsofuse',
            templateUrl: 'common/bottom-navBar/termsOfUser.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
        .state('cookie-policy', {
            url: '/cookiepolicy',
            templateUrl: 'common/bottom-navBar/cookiepolicy.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
        .state('privacy-statement', {
            url: '/privacystatement',
            templateUrl: 'common/bottom-navBar/privacystatement.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
        .state('contact-us', {
            url: '/contactus',
            templateUrl: 'common/bottom-navBar/contact.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
    ;
}
function footerController(WeirService){
    var vm = this;

    var navlabels = WeirService.navBarLabels();
    switch (WeirService.Locale()) {
        case 'fr':
            vm.navlabels = navlabels.fr;
            break;
        default:
            vm.navlabels = navlabels.en;
            break;
    }

}