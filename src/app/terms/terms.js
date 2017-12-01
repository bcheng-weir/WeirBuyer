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
            controllerAs: 'termsAndCondition',
            resolve: {
                WeirGroup: function (Me) {
                    return Me.Org.xp.WeirGroup.label;
                }
            }
        });
}

function TermsAndConditionsController($sce, WeirService, WeirGroup) {
    var vm = this;
    vm.lang = WeirService.Locale();
    vm.WeirGroup = WeirGroup;
    var labels = {
        en: {
            TermsAndConditions: "Terms And Conditions"
        },
        fr: {
            TermsAndConditions: $sce.trustAsHtml("Termes et conditions")
        }
    };
    var navlabels = WeirService.navBarLabels();
    switch (vm.lang) {
        case 'fr':
            vm.navlabels = navlabels.fr;
            break;
        default:
            vm.navlabels = navlabels.en;
            break;
    }
    vm.labels = WeirService.LocaleResources(labels);
}