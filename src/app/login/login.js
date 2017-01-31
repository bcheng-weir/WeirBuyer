angular.module('orderCloud')
    .config(LoginConfig)
    .factory('LoginService', LoginService)
    .controller('LoginCtrl', LoginController)
;

function LoginConfig($stateProvider) {
    $stateProvider
        .state('login', {
            url: '/login/:token',
            templateUrl: 'login/templates/login.tpl.html',
            controller: 'LoginCtrl',
            controllerAs: 'login'
        })
    ;
}

function LoginService($q, $window, $state, toastr, OrderCloud, TokenRefresh, clientid, buyerid, anonymous, appname, $localForage) {
    return {
        SendVerificationCode: _sendVerificationCode,
        ResetPassword: _resetPassword,
        RememberMe: _rememberMe,
	    GetUsername: _getUsername,
	    SetUsername: _setUsername,
        Logout: _logout,
        RouteAfterLogin: _routeAfterLogin
    };

    function _routeAfterLogin() {
        SetFSInfo();
        var storageName = appname + '.routeto';
        $localForage.getItem(storageName)
        .then(function (rte) {
            $localForage.removeItem(storageName);
            if (rte && rte.state) {
                if (rte.state == 'orders') {
                    $state.go('orders.goto', { orderID: rte.id });
                } else if (rte.state == 'quotes') {
                    $state.go('quotes.goto', { quoteID: rte.id });
                } else {
                    $state.go('home');
                }
            } else {
                $state.go('home');
            }
        })
        .catch(function () {
            $state.go('home');
        });
    }
    function SetFSInfo() {
        OrderCloud.Me.Get()
        .then(function (usr) {
            FS.identify(usr.ID, {
                displayName: usr.FirstName + ' ' + usr.LastName,
                email: usr.Email,
                group: (usr.xp.WeirGroup && usr.xp.WeirGroup.label) ? usr.xp.WeirGroup.label : "Not set",
                buyer: buyerid
            });
        });
    }

    function _sendVerificationCode(email) {
        var deferred = $q.defer();

        var passwordResetRequest = {
            Email: email,
            ClientID: clientid,
            URL: encodeURIComponent($window.location.href) + '{0}'
        };

        OrderCloud.PasswordResets.SendVerificationCode(passwordResetRequest)
            .then(function() {
                deferred.resolve();
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    function _resetPassword(resetPasswordCredentials, verificationCode) {
        var deferred = $q.defer();

        var passwordReset = {
            ClientID: clientid,
            Username: resetPasswordCredentials.ResetUsername,
            Password: resetPasswordCredentials.NewPassword
        };

        OrderCloud.PasswordResets.ResetPassword(verificationCode, passwordReset).
            then(function() {
                deferred.resolve();
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    function _logout(){
        OrderCloud.Auth.RemoveToken();
        OrderCloud.Auth.RemoveImpersonationToken();
        OrderCloud.BuyerID.Set(null);
        TokenRefresh.RemoveToken();
        $state.go(anonymous ? 'home' : 'login', {}, {reload: true});
    }

    // We are not using this base functionality. Only remember the user name.
    function _rememberMe(username) {

        /*TokenRefresh.GetToken()
            .then(function (refreshToken) {
                if (refreshToken) {
                    TokenRefresh.Refresh(refreshToken)
                        .then(function(token) {
                            OrderCloud.Auth.SetToken(token.access_token);
                            OrderCloud.Buyers.List()
	                            .then(function (buyers) {
	                                if (buyers && buyers.Items.length > 0) {
	                                    var buyer = buyers.Items[0];
	                                    buyerid = buyer.ID;
	                                    OrderCloud.BuyerID.Set(buyer.ID);
	                                    CurrentOrder.Remove()
	                                        .then(function () {
	                                            return CurrentOrder.SetCurrentCustomer({ id: buyer.ID, name: buyer.Name });
	                                        });
	                                    _routeAfterLogin();
	                                }
                                });
                        })
                        .catch(function () {
                            toastr.error('Your token has expired, please log in again.');
                        });
                } else {
                    _logout();
                }
            });*/
    }

    function _setUsername(username) {
	    $localForage.setItem('username',username);
    }

    function _getUsername() {
    	var dfd = $q.defer();
    	$localForage.getItem('username')
		    .then(function(username) {
		    	dfd.resolve(username);
		    });
	    return dfd.promise;
    }
}

function LoginController($state, $stateParams, $q, $exceptionHandler, $sce, $cookieStore, OrderCloud, LoginService, WeirService, TokenRefresh, CurrentOrder, buyerid) {
    var vm = this;
	var username = null;
	LoginService.GetUsername()
		.then(function(myUsername) {
			console.log('My User Name: ' + myUsername);
			username = myUsername;
			vm.credentials = {
				Username: username,
				Password: null
			};
			vm.rememberStatus = username ? true : false;
		});
	/*vm.credentials = {
		Username: username,
		Password: null
	};*/
    vm.token = $stateParams.token;
    vm.form = vm.token ? 'reset' : 'login';
    vm.setForm = function(form) {
        vm.form = form;
    };
    var labels = {
        en: {
            LoginLabel: "Please enter your login details",
            UsernameLabel: "Username",
            PasswordLabel: "Password",
            BackToLoginLabel: "Back to Login",
            ForgotPasswordLabel: "Forgot Password",
            NewPasswordLabel: "New Password",
            RememberMe: "Remember Me",
            WorldWide: "Go to global website",
            ConfirmPasswordLabel: "Confirm Password",
            ResetPasswordMessage: "Your password has been reset.",
            ForgotMessageLabel: "Forgot Password email has been sent. Please check your email in order to reset your password.",
            ResetPasswordLabel: "Reset Password",
            SubmitLabel: $sce.trustAsHtml("Submit  <i class='icon-right-arrow'></i>"),
            BadUsernamePassword: "We are not able to recognise the email or password entered. Please check and re-enter."
        },
        fr: {
            LoginLabel: $sce.trustAsHtml("Veuillez saisir vos identifiants"),
            UsernameLabel: $sce.trustAsHtml("Nom d'utilisateur"),
            PasswordLabel: $sce.trustAsHtml("Mot de passe"),
            BackToLoginLabel: $sce.trustAsHtml("Retourner &agrave; l'identification"),
            ForgotPasswordLabel: $sce.trustAsHtml("Mot de passe oubli&eacute;"),
            RememberMe: $sce.trustAsHtml("Se souvenir de mes identifiants"),
            WorldWide: $sce.trustAsHtml("Acc&eacute;der au site global"),
            NewPasswordLabel: $sce.trustAsHtml("Nouveau mot de passe"),
            ConfirmPasswordLabel: $sce.trustAsHtml("Confirmer votre mot de passe"),
            ResetPasswordMessage: $sce.trustAsHtml("Votre mot de passe a &eacute;t&eacute; chang&eacute;"),
            ForgotMessageLabel: $sce.trustAsHtml("Un e-mail a &eacute;t&eacute; envoy&eacute;. Veuillez regarder vos e-mails afin de changer votre mot de passe."),
            ResetPasswordLabel: $sce.trustAsHtml("Changer de mot de passe"),
            SubmitLabel: $sce.trustAsHtml("Soumettre  <i class='icon-right-arrow'></i>"),
            BadUsernamePassword: $sce.trustAsHtml("Nous ne reconnaissons pas cet e-mail ou ce mot de passe. Merci de vérifier vos identifiant, puis veuillez réessayer.")
        }
    };
    var navlabels = WeirService.navBarLabels();
    switch (WeirService.Locale()) {
        case 'fr':
            vm.labels = labels.fr;
            vm.navlabels = navlabels.fr;
            break;
        default:
            vm.labels = labels.en;
            vm.navlabels = navlabels.en;
            break;
    }
    vm.languageOfUser = WeirService.Locale();

    vm.submit = function() {
        OrderCloud.Auth.GetToken(vm.credentials)
            .then(function(data) {
                //vm.rememberStatus ? TokenRefresh.SetToken(data['refresh_token']) : angular.noop();
	            //vm.rememberStatus ? LoginService.RememberMe(vm.credentials.Username) : angular.noop();
	            if(vm.rememberStatus) {
	            	LoginService.SetUsername(vm.credentials.Username);
	            } else {
		            LoginService.SetUsername(null);
	            }
	            console.log(TokenRefresh.Get());
                OrderCloud.Auth.SetToken(data['access_token']);
                OrderCloud.Buyers.List().then(function (buyers) {
                    if (buyers && buyers.Items.length > 0) {
                        var buyer = buyers.Items[0];
                        buyerid = buyer.ID;
                        OrderCloud.BuyerID.Set(buyer.ID);
                        CurrentOrder.Remove()
                            .then(function () {
                                return CurrentOrder.SetCurrentCustomer({ id: buyer.ID, name: buyer.Name });
                            });
                            var lang = WeirService.Locale();
                            //set the expiration date of the cookie.
                            var now = new Date();
                            var exp = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
                            if (buyer.xp.WeirGroup.id == 2) {
                                //make it fr
                                lang = "fr";
                                $cookieStore.put('language', 'fr', {
                                    expires: exp
                                });
                            }
                            if (buyer.xp.WeirGroup.id == 1) {
                                //make it en
                                lang = "en";
                                $cookieStore.put('language', 'en', {
                                    expires: exp
                                });
                            }
                        LoginService.RouteAfterLogin();
                    }
                });
            })
            .catch(function(ex) {
                if(ex.status == 400) {
                    ex.data.error = vm.labels.BadUsernamePassword;
                }
                $exceptionHandler(ex);
            });
    };
    vm.setCookie = function (lang) {
        var now = new Date();
        var exp = new Date(now.getFullYear(), now.getMonth()+6, now.getDate());
        $cookieStore.put('language', lang, {
            expires: exp
        });
        window.location.reload();
    };
    vm.forgotPassword = function() {
        LoginService.SendVerificationCode(vm.credentials.Email)
            .then(function() {
                vm.setForm('verificationCodeSuccess');
                vm.credentials.Email = null;
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };

    vm.resetPassword = function() {
        LoginService.ResetPassword(vm.credentials, vm.token)
            .then(function() {
                vm.setForm('resetSuccess');
                vm.token = null;
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            });
    };
}
