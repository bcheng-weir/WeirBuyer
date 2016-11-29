angular.module('orderCloud')
    .config(BaseConfig)
    .controller('BaseCtrl', BaseController)
    .controller('NewQuoteCtrl', NewQuoteModalController)
    .filter('occomponents', occomponents)
;

function BaseConfig($stateProvider, $injector) {
    var baseViews = {
        '': {
            templateUrl: 'base/templates/base.tpl.html',
            controller: 'BaseCtrl',
            controllerAs: 'base'
        }
    };

    if ($injector.has('base')) {
        var baseConfig = $injector.get('base');

        //conditional base left
        baseConfig.left ? baseViews['left@base'] = {
            'templateUrl': 'base/templates/base.left.tpl.html'
        } : angular.noop();

        //conditional base right
        baseConfig.right ? baseViews['right@base'] = {
            'templateUrl': 'base/templates/base.right.tpl.html'
        } : angular.noop();

        //conditional base top
        baseConfig.top ? baseViews['top@base'] = {
            'templateUrl': 'base/templates/base.top.tpl.html'
        } : angular.noop();

        //conditional base bottom
        baseConfig.bottom ? baseViews['bottom@base'] = {
            'templateUrl': 'base/templates/base.bottom.tpl.html'
        } : angular.noop();
    }

    var baseState = {
        url: '',
        abstract: true,
        views: baseViews,
        resolve: {
            CurrentUser: function($q, $state, OrderCloud, buyerid, anonymous) {
                var dfd = $q.defer();
                OrderCloud.Me.Get()
                    .then(function(data) {
                        dfd.resolve(data);
                    })
                    .catch(function(){
                        if (anonymous) {
                            if (!OrderCloud.Auth.ReadToken()) {
                                OrderCloud.Auth.GetToken('')
                                    .then(function(data) {
                                        OrderCloud.Auth.SetToken(data['access_token']);
                                    })
                                    .finally(function() {
                                        OrderCloud.BuyerID.Set(buyerid);
                                        dfd.resolve({});
                                    });
                            }
                        } else {
                            OrderCloud.Auth.RemoveToken();
                            OrderCloud.Auth.RemoveImpersonationToken();
                            OrderCloud.BuyerID.Set(null);
                            $state.go('login');
                            dfd.resolve();
                        }
                    });
                return dfd.promise;
            },
            AnonymousUser: function($q, OrderCloud, CurrentUser) {
                CurrentUser.Anonymous = angular.isDefined(JSON.parse(atob(OrderCloud.Auth.ReadToken().split('.')[1])).orderid);
            },
            ComponentList: function($state, $q, Underscore, CurrentUser) {
                var deferred = $q.defer();
                var nonSpecific = ['Buyers', 'Products', 'Customers'];
                var components = {
                    nonSpecific: [],
                    buyerSpecific: []
                };
                angular.forEach($state.get(), function(state) {
                    if (!state.data || !state.data.componentName) return;
                    if (nonSpecific.indexOf(state.data.componentName) > -1) {
                        if (Underscore.findWhere(components.nonSpecific, {Display: state.data.componentName}) == undefined) {
                            components.nonSpecific.push({
                                Display: state.data.componentName,
                                StateRef: state.name
                            });
                        }
                    } else {
                        if (Underscore.findWhere(components.buyerSpecific, {Display: state.data.componentName}) == undefined) {
                            components.buyerSpecific.push({
                                Display: state.data.componentName,
                                StateRef: state.name
                            });
                        }
                    }
                });
                deferred.resolve(components);
                return deferred.promise;
            }
        }
    };

    $stateProvider.state('base', baseState);
}


function BaseController($state, $rootScope, $uibModal, CurrentOrder, $ocMedia, $sce, Underscore, snapRemote, defaultErrorMessageResolver, CurrentUser, ComponentList, WeirService, base) {
    var vm = this;
    vm.left = base.left;
    vm.right = base.right;
    vm.currentUser = CurrentUser;
    vm.catalogItems = ComponentList.nonSpecific;
    vm.organizationItems = ComponentList.buyerSpecific;
    vm.registrationAvailable = Underscore.filter(vm.organizationItems, function (item) {
        return item.StateRef == 'registration'
    }).length;

    //var vm = this; Is this supposed to happen twice?
    var navlabels = WeirService.navBarLabels();
    switch (WeirService.Locale()) {
        case 'fr':
            vm.navlabels = navlabels.fr;
            break;
        default:
            vm.navlabels = navlabels.en;
            break;
    }
    if (WeirService.Locale() == "fr") {
        // defaultErrorMessageResolver.setI18nFileRootPath('/bower_components/angular-auto-validate/dist/lang');
        // defaultErrorMessageResolver.setCulture('fr-FR');
        // defaultErrorMessageResolver.getErrorMessages('fr-FR').then(function (errorMessages) {
        defaultErrorMessageResolver.getErrorMessages().then(function (errorMessages) {
            errorMessages['customPassword'] = $sce.trustAsHtml("Mot de passe doit comporter au moins huit caract$eacute;res et inclure au moins une lettre et un chiffre");
            //regex for customPassword = ^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!$%@#£€*?&]{8,}$
            errorMessages['positiveInteger'] = $sce.trustAsHtml("S\'il vous pla$icirc;t entrer un entier positif");
            //regex positiveInteger = ^[0-9]*[1-9][0-9]*$
            errorMessages['ID_Name'] = $sce.trustAsHtml("Seuls les caract&eacute;res alphanum&eacute;riques, des traits d'union et de soulignement sont autoris&eacute;s");
            //regex ID_Name = ([A-Za-z0-9\-\_]+)
            errorMessages['confirmpassword'] = 'Vos mots de passe ne correspondent pas';
            errorMessages['noSpecialChars'] = $sce.trustAsHtml("Seuls les caract$eacute;res alphanum$eacute;riques sont autoris$eacute;s'");
            errorMessages['wholenumber'] = $sce.trustAsHtml("S'il vous pla&icirc;t entrer un nombre entier");
        });
    } else {
        defaultErrorMessageResolver.getErrorMessages().then(function (errorMessages) {
            errorMessages['customPassword'] = 'Password must be at least eight characters long and include at least one letter and one number';
            //regex for customPassword = ^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!$%@#£€*?&]{8,}$
            errorMessages['positiveInteger'] = 'Please enter a positive integer';
            //regex positiveInteger = ^[0-9]*[1-9][0-9]*$
            errorMessages['ID_Name'] = 'Only Alphanumeric characters, hyphens and underscores are allowed';
            //regex ID_Name = ([A-Za-z0-9\-\_]+)
            errorMessages['confirmpassword'] = 'Your passwords do not match';
            errorMessages['noSpecialChars'] = 'Only Alphanumeric characters are allowed';
            errorMessages['wholenumber'] = 'Please enter a whole number';
        });
    }

    vm.snapOptions = {
        disable: (!base.left && base.right) ? 'left' : ((base.left && !base.right) ? 'right' : 'none')
    };

    vm.sendToSearch = function () {
        var searchType = WeirService.GetLastSearchType();
        searchType = searchType || WeirService.SearchType.Serial;
        if (searchType == WeirService.SearchType.Part) {
            $state.go('search.part');
        } else if (searchType == WeirService.SearchType.Tag) {
            $state.go('search.tag');
        } else {
            $state.go('search.serial');
        }
    };

    function _isMobile() {
        return $ocMedia('max-width:991px');
    }

    function _initDrawers(isMobile) {
        snapRemote.close('MAIN');
        if (isMobile && (base.left || base.right)) {
            snapRemote.enable('MAIN');
        } else {
            snapRemote.disable('MAIN');
        }
    }

    _initDrawers(_isMobile());

    $rootScope.$watch(_isMobile, function (n, o) {
        if (n === o) return;
        _initDrawers(n);
    });

    vm.OrderAction = _actions;
    function _actions(action) {
        var filter = {
            "orders.submitted": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.SubmittedWithPO.id,
                "xp.Active": true
            },
            "orders.pending": {
                "xp.Type": "Order",
	            "xp.PendingPO": true,
	            "xp.Active": true
            },
            "orders.revised": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.RevisedOrder.id,
                "xp.Active": true
            },
            "orders.confirmed": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.ConfirmedOrder.id,
                "xp.Active": true
            },
            "orders.despatched": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.Despatched.id,
                "xp.Active": true
            },
            "orders.invoiced": {
                "xp.Type": "Order",
                "xp.Status": WeirService.OrderStatus.Invoiced.id,
                "xp.Active": true
            }
        };
        $state.go(action, {filters: JSON.stringify(filter[action])}, {reload: true});
    }

    vm.newQuote = function () {
        //check if the current order status is unsubmitted/draft mode
        CurrentOrder.Get().then(function (resultOrder) {
            if (resultOrder.Status == "Unsubmitted" && resultOrder.xp.Status == "DR") {
                var modalInstance = $uibModal.open({
                    animation: true,
                    ariaDescribedBy: 'modal-body',
                    templateUrl: 'base/templates/base.top.newquoteconfirm.tpl.html',
                    controller: 'NewQuoteCtrl',
                    controllerAs: 'newQuote',
                    size: 'lg'
                });
                modalInstance.result.then(
                    function (val) {
                        if (val == "Unsubmitted") {
                            $rootScope.$broadcast('search.ClearFilter');
                            $rootScope.$broadcast('search.selfsearch', false);
                            $rootScope.$broadcast('search.searchall', false);
                            $rootScope.$broadcast('OC:RemoveOrder');
                            CurrentOrder.Remove().then(function () {
                                $state.go('search', {}, {reload: true});
                            });
                        } else {
                            return;
                        }
                    });
            }
            else {
                $rootScope.$broadcast('search.ClearFilter');
                $rootScope.$broadcast('search.selfsearch', false);
                $rootScope.$broadcast('search.searchall', false);
                $rootScope.$broadcast('OC:RemoveOrder');
                CurrentOrder.Remove().then(function () {
                    $state.go('search', {}, {reload: true});
                });
            }
        })
            .catch(function () {
                $state.go('search', {}, {reload: true});
            });
    };
}

function NewQuoteModalController($uibModalInstance, WeirService) {
    var vm = this;

    vm.continue = function () {
        $uibModalInstance.close("Unsubmitted");
    };

    vm.cancel = function () {
        $uibModalInstance.close("");
    };
    var labels = {
        en: {
            NQHeader: "",
            NQBody: "If you are currently creating a quote or order, please save your changes before creating a new quote",
            ContinueBtn: "Continue",
            CancelBtn: "Cancel"
        },
        fr: {
            NQHeader: "",
            NQBody: "Si vous créez actuellement une soumission ou une commande, enregistrez vos modifications avant de créer une nouvelle soumission",
            ContinueBtn: "Continuer",
            CancelBtn: "Annuler"
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
}

function occomponents() {
    return function(components) {
        var filtered = ['registration'];
        var result = [];

        angular.forEach(components, function(component) {
            if (filtered.indexOf(component.StateRef) == -1) result.push(component);
        });

        return result;
    }
}
