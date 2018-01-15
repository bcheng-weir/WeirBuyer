angular.module('orderCloud')
    .config(BaseConfig)
    .controller('BaseCtrl', BaseController)
    .controller('NewQuoteCtrl', NewQuoteModalController)
    .controller('FeedbackCtrl', FeedbackController)
    .controller('DivisionCtrl', DivisionSelectorController)
    .filter('occomponents', occomponents)
;

function BaseConfig($stateProvider, $injector, $sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'https://www.global.weir/**',
	    'https://weirwebhooks.azurewebsites.net/**',
	    'http://www.store.flowcontrol.weir/**',
        'http://store.flowcontrol.weir/**',
	    'https://api.ordercloud.io/**',
	    'https://r.fullstory.com/**',
	    'https://s3.us-east-2.amazonaws.com/ordercloudtest/**',
	    'https://s3.eu-west-2.amazonaws.com/ordercloudfiles/**'
    ]);
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
            CurrentUser: function($q, $state, OrderCloudSDK, anonymous, Me, LoginService) {
                if(!Me.GetBuyerID()) {
                	LoginService.Logout();
                }
                var dfd = $q.defer();
	            OrderCloudSDK.Me.Get()
                    .then(function(data) {
                        dfd.resolve(data);
                    })
                    .catch(function(){
                        if (anonymous) {
                            /*if (!OrderCloudSDK.Auth.ReadToken()) {
	                            OrderCloudSDK.Auth.GetToken('')
                                    .then(function(data) {
	                                    OrderCloudSDK.Auth.SetToken(data['access_token']);
                                    })
                                    .finally(function() {
	                                    OrderCloudSDK.BuyerID.Set(buyerid);
                                        dfd.resolve({});
                                    });
                            }*/
                        } else {
	                        OrderCloudSDK.RemoveToken();
	                        OrderCloudSDK.RemoveImpersonationToken();
	                        //OrderCloudSDK.BuyerID.Set(null);
                            $state.go('login');
                            dfd.resolve();
                        }
                    });
                return dfd.promise;
            },
            CurrentOrg: function(OrderCloudSDK, Me) {
            	return OrderCloudSDK.Buyers.Get(Me.GetBuyerID());
            },
            IdentifyMe : function(OrderCloudSDK, Me, $q) {
                var dfd = $q.defer();
                OrderCloudSDK.Me.Get()
                    .then(function (usr) {
                        FS.identify(usr.ID, {
                            displayName: usr.FirstName + ' ' + usr.LastName,
                            email: usr.Email
                            //group: (usr.xp.WeirGroup && usr.xp.WeirGroup.label) ? usr.xp.WeirGroup.label : "Not set",
                            //buyer: buyerid
                        });
                    })
                    .catch(function (e) {
                        console.log("An error was thrown: " + e.message);
                        dfd.resolve();
                    });
                dfd.resolve();
            },
            ComponentList: function($state, $q, Underscore) {
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

function BaseController($q, $document, $state, $rootScope, $uibModal, CurrentOrder, $ocMedia, $sce, Underscore, snapRemote, defaultErrorMessageResolver, CurrentUser, CurrentOrg, ComponentList, WeirService, $window, base, Me) {
    var vm = this;
    vm.left = base.left;
    vm.right = base.right;
    Me.Profile = CurrentUser;
    Me.Org = CurrentOrg;
    vm.EnquiryAllowed = function() {
        return Me.Org.xp.WeirGroup.label == "WPIFR";
    };
    vm.OrganizationUsed = Me.Org;
    vm.currentUser = CurrentUser;
    vm.catalogItems = ComponentList.nonSpecific;
    vm.organizationItems = ComponentList.buyerSpecific;
    vm.registrationAvailable = Underscore.filter(vm.organizationItems, function (item) {
        return item.StateRef == 'registration'
    }).length;

    var labels = {
        en: {
	        title: "Please send us your feedback and suggestions",
	        bugDefect: "Bug or error",
	        suggestion: "Suggestion",
            Batley: "About Batley",
            Blakeborough: "About Blakeborough",
            Hopkinsons: "About Hopkinsons",
            Sarasin: "About Sarasin",
            Feedback: "Beta feedback",
            Register: "Register/Login",
            Logout: "Logout",
            BrandsUK1: $sce.trustAsHtml("Batley<sup>®</sup>"),
            BrandsUK2: $sce.trustAsHtml("Blakeborough<sup>®</sup>"),
            BrandsUK3: $sce.trustAsHtml("Hopkinsons<sup>®</sup>"),
            BrandsFR: $sce.trustAsHtml("Sarasin - RSBD<sup>TM</sup>"),
            TooltipSarasin: $sce.trustAsHtml("Your enquiries will be managed by your existing Sarasin-RSBD<sup>TM</sup> aftermarket spares team"),
            TooltipBBH: "Your enquiries will be managed by your existing Weir Valves & Controls UK aftermarket spares team"
        },
        fr: {
            title: $sce.trustAsHtml("Envoyez-nous vos commentaires et suggestions"),
            Feedback: $sce.trustAsHtml("Retour et commentaires sur la Beta"),
            bugDefect: $sce.trustAsHtml("Bogue ou erreur"),
            suggestion: $sce.trustAsHtml("Suggestion"),
            Sarasin: $sce.trustAsHtml("À propos de Sarasin"),
            Register: $sce.trustAsHtml("Inscription / Connexion"),
            Logout: $sce.trustAsHtml("Se déconnecter"),
            TooltipSarasin: $sce.trustAsHtml("Your enquiries will be managed by your existing Sarasin-RSBD<sup>TM</sup> aftermarket spares team"),
            TooltipBBH: "Your enquiries will be managed by your existing Weir Valves & Controls UK aftermarket spares team"
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
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

    vm.showFeedbackForm = function () {
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'base/templates/base.feedback.tpl.html',
            controller: 'FeedbackCtrl',
            controllerAs: 'feedback',
            size: 'sm',
            resolve: {
                User: function () {
                    return CurrentUser;
                }
            }
        });
        modalInstance.result;
    };

    vm.showAppNavigation = function() {
        //Can the user swap between FR and EN.
        var show = false;
        if(Me.Org && Me.Org.xp && Me.Org.xp.AKA) {
            angular.forEach(Me.Org.xp.AKA, function(value, key) {
                if(Me.Org.xp.WeirGroup.Label != key.substring(0,5)) {
                    show = true;
                }
            });
        }
        return show;
    };

    vm.AppLocale = function() {
        if (Me.Org && Me.Org.xp && Me.Org.xp.WeirGroup) {
            return Me.Org.xp.WeirGroup.label;
        }
        return false;
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
                "xp.Status": WeirService.OrderStatus.RevisedOrder.id+"|"+WeirService.OrderStatus.RejectedRevisedOrder.id,
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
            "quotes.saved": {
                "xp.Type": "Quote",
                "xp.Status": WeirService.OrderStatus.Saved.id+"|"+WeirService.OrderStatus.Draft.id,
                "xp.Active":true
            },
            "quotes.enquiry" : {
	            "xp.Type": "Quote",
                "xp.Status": WeirService.OrderStatus.Enquiry.id+"|"+WeirService.OrderStatus.EnquiryReview.id,
	            "xp.Active":true
            },
	        "quotes.inreview": {
		        "xp.Type": "Quote",
		        "xp.Status": WeirService.OrderStatus.Submitted.id+"|"+WeirService.OrderStatus.Review.id,
		        "xp.Active":true
	        },
	        "quotes.revised": {
		        "xp.Type": "Quote",
		        "xp.Status": WeirService.OrderStatus.RevisedQuote.id+"|"+WeirService.OrderStatus.RejectedQuote.id,
		        "xp.Active":true
	        },
	        "quotes.confirmed": {
		        "xp.Type": "Quote",
		        "xp.Status": WeirService.OrderStatus.ConfirmedQuote.id,
		        "xp.Active":true
	        },
            "quotes.all": {
                "xp.Type": "Quote",
                "xp.Active": true
            },
            "orders.all": {
                "xp.Type": "Order",
                "xp.Active": true
            }
        };
        $state.go(action, {filters: JSON.stringify(filter[action])}, {reload: true});
    }

    vm.newQuote = function () {
        //check if the current order status is unsubmitted/draft mode
        CurrentOrder.Get()
            .then(function (resultOrder) {
                if (resultOrder.Status == "Unsubmitted" && resultOrder.xp.Status == WeirService.OrderStatus.Draft.id) {
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
                } else {
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

    /*vm.selectBrand = function() { //deprecated TODO delete
        //var parentElem = angular.element($document[0].querySelector('body'));
        $uibModal.open({
            animation:true,
            size:'lg',
            templateUrl:'brands/templates/brands.select.tpl.html',
            controller: 'DivisionCtrl',
            controllerAs: 'division'
            //appendTo: parentElem
        });
    };*/

    var brandTemplate = {
        'WPIFR':'base/templates/base.brandspopoverFR.tpl.html',
        'WVCUK':'base/templates/base.brandspopoverUK.tpl.html'
    };
    vm.brandsPopover = {
        templateUrl: Me.Org.ID.substring(0,5)=='WVCUK' ? brandTemplate['WPIFR'] : brandTemplate['WVCUK']
    };

    vm.selectBrand = function(selectedDivision) {
        var dfd = $q.defer();
        WeirService.DivisionSelection(selectedDivision)
            .then(function () {
                //due to cache reset- reload window.
                dfd.resolve();
            })
            .catch(function (err) {
                //what should be the error handling?
                console.log(err);
                dfd.reject();
            });
        return dfd.promise;
    }

    vm.currentImage = "../../../assets/images/MaterialIcon1.svg";
    vm.toggleImage = function() {
        if(vm.currentImage == "../../../assets/images/MaterialIcon1.svg") {
            vm.currentImage = "../../../assets/images/MaterialIcon2.svg";
            vm.brandIcon={'background-color':'#425563'};
        } else {
            vm.currentImage = "../../../assets/images/MaterialIcon1.svg";
            vm.brandIcon={'background-color':'#e9e9e9'};
        }
    }
}

function NewQuoteModalController($uibModalInstance, WeirService, $sce) {
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
            NQBody: $sce.trustAsHtml("Si vous créez actuellement une soumission ou une commande, enregistrez vos modifications avant de créer une nouvelle soumission"),
            ContinueBtn: $sce.trustAsHtml("Continuer"),
            CancelBtn: $sce.trustAsHtml("Annuler")
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

function DivisionSelectorController($uibModalInstance, $window, $q, WeirService) {
    var vm = this;
    vm.BrandSelected = function (selectedDivision) {
        var dfd = $q.defer();
        WeirService.DivisionSelection(selectedDivision)
            .then(function () {
                console.log("Success!");
                $uibModalInstance.close();
                //due to cache reset- reload window.
                $window.location.reload();
                dfd.resolve();
            })
            .catch(function (err) {
                //what should be the error handling?
                console.log(err);
                dfd.reject();
            });

        return dfd.promise;
    }
}

function FeedbackController($sce, $uibModalInstance, $state, OrderCloudSDK, Me, WeirService, User) {
    var vm = this;
    vm.user = User;
    vm.Cancel = cancel;
    vm.Send = sendFeedback;
    var labels = {
        en: {
            title: "Please send us your feedback and suggestions",
            bugDefect: "Bug or error",
            suggestion: "Suggestion",
            bug : "If reporting a bug, your issue will be raised with our development team. All suggestions and feedback will be reviewed by our Beta project team.",
            YourFeedback: "Your feedback",
            TypeFeedback: "Type of feedback",
            Email: "Your email",
            Feedback: "Beta feedback",
            Cancel: "Cancel"
        },
        fr: {
            title: $sce.trustAsHtml("Envoyez-nous vos commentaires et suggestions"),
            bugDefect: $sce.trustAsHtml("Bogue ou erreur"),
            suggestion: $sce.trustAsHtml("Suggestion"),
            bug : $sce.trustAsHtml("Si vous signalez un bogue, celui-ci sera soumit à notre équipe de développement."),
            YourFeedback: $sce.trustAsHtml("Votre commentaire"),
            TypeFeedback: $sce.trustAsHtml("Type de commentaires"),
            Email: $sce.trustAsHtml("Votre adresse E-mail"),
            Feedback: $sce.trustAsHtml("Retour et commentaires sur la Beta"),
            Cancel: $sce.trustAsHtml("Annuler")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.typesOfFeedback = [
        { Label: "bug", Name: vm.labels.bugDefect },
        { Label: "suggestion", Name: vm.labels.suggestion }
    ];
    vm.type = "suggestion";
        
    function cancel() {
        $uibModalInstance.dismiss('cancel');
    }
    function sendFeedback() {
        var data = {
            xp: {
                feedback: {
                    from: vm.email,
                    type: vm.type,
                    content: vm.content,
                    time: (new Date()).toISOString(),
                    page: $state.current.name
                }
            }
        };
        var usr = vm.user;
        if (usr) {
	        OrderCloudSDK.Users.Patch( Me.GetBuyerID(), usr.ID, data );
        }
        $uibModalInstance.close();
    }
}