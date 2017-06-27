angular.module('orderCloud')
    .config(TermsConfig)
    .controller('TermsAndConditionsCtrl', TermsAndConditionsController);

function TermsConfig($stateProvider) {
    $stateProvider
        .state('termsandconditions',{
            parent:'base',
            url: '/termsandconditions',
            templateUrl: 'terms/templates/termsandconditions.tpl.html',
            controller: 'TermsAndConditionsCtrl',
            controllerAs: 'termsAndCondition'
        });
}

function TermsAndConditionsController($sce,WeirService){
    var vm = this;
    var labels = {
        en: {
            TermsAndConditions: "Terms And Conditions"
        },
        fr: {
            TermsAndConditions: $sce.trustAsHtml("Termes et conditions")
        }
    };
    var navlabels = WeirService.navBarLabels();
    switch (WeirService.Locale()) {
        case 'fr':
            vm.navlabels = navlabels.fr;
            break;
        default:
            vm.navlabels = navlabels.en;
            break;
    }
    vm.labels = WeirService.LocaleResources(labels);
}