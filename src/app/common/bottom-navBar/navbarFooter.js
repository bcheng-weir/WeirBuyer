angular.module('orderCloud')
    .config(navConfig)
    .controller('footerCtrl', footerController)
    .directive('rsmFooter', rsmFooterDirective);

function navConfig($stateProvider) {
    $stateProvider
        .state('terms-of-use', {
            url: '/termsofuse',
            templateUrl: 'common/bottom-navBar/templates/termsOfUser.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
        .state('cookie-policy', {
            url: '/cookiepolicy',
            templateUrl: 'common/bottom-navBar/templates/cookiepolicy.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
        .state('privacy-statement', {
            url: '/privacystatement',
            templateUrl: 'common/bottom-navBar/templates/privacystatement.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
        .state('contact-us', {
            url: '/contactus',
            templateUrl: 'common/bottom-navBar/templates/contact.tpl.html',
            controller: 'footerCtrl',
            controllerAs: 'footer'
        })
    ;
}
function footerController(WeirService, Me){
    var vm = this;
    vm.LangOfUser = WeirService.Locale();
    vm.BusinessOrigin;
    if(Me.Org)
    {
        vm.BusinessOrigin = Me.Org.xp.WeirGroup.id;
    }
    else
    {
        vm.BusinessOrigin = null;
    }
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
function rsmFooterDirective() {
    return {
        restrict: 'A',
        templateUrl: 'common/bottom-navBar/templates/navbarFooter.tpl.html',
        controller: 'footerCtrl',
        controllerAs: 'footer'
    }
}