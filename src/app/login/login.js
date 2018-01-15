angular.module('orderCloud')
    .config(LoginConfig)
    .factory('LoginService', LoginService)
    .controller('LoginCtrl', LoginController)
    .controller('NewPassCtrl', NewPasswordController);

function LoginConfig($stateProvider) {
    $stateProvider
        .state('login', {
            url: '/login/:token',
            templateUrl: 'login/templates/login.tpl.html',
            controller: 'LoginCtrl',
            controllerAs: 'login'
        })
		.state('loginDivisions', {
			url: '/loginDivision',
			templateUrl: 'login/templates/login.division.tpl.html',
			controller: 'LoginCtrl',
			controllerAs: 'login'
		});
}

function LoginService($q, $state, OrderCloudSDK, TokenRefresh, clientid, anonymous, appname, $localForage, Me, $window) {
    return {
        SendVerificationCode: _sendVerificationCode,
        ResetPassword: _resetPassword,
        RememberMe: _rememberMe,
	    GetUsername: _getUsername,
	    SetUsername: _setUsername,
        Logout: _logout,
        RouteAfterLogin: _routeAfterLogin
    };
    //global
    var WhoAmI = null;
    //end global
    //clean up and add option to goto the division selection screen.
	//division selection will then routeAfterLogin
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
						$state.go('home',{},{reload:true});
					}
				} else {
					$state.go('home',{},{reload:true});
				}
			})
			.catch(function () {
				$state.go('home',{},{reload:true});
			});
    }

    function SetFSInfo() {
        var dfd = $q.defer();
        OrderCloudSDK.Me.Get()
            .then(function (usr) {
                FS.identify(usr.ID, {
                    displayName: usr.FirstName + ' ' + usr.LastName,
                    email: usr.Email
                });
            })
            .catch(function (e) {
                console.log("An error was thrown: " + e.message);
                dfd.resolve();
            });
        dfd.resolve();
    }

    function _sendVerificationCode(email) {
        var deferred = $q.defer();

        var passwordResetRequest = {
            Email: email,
            ClientID: clientid,
	        URL: encodeURIComponent($window.location.href) + '{0}'
        };

	    OrderCloudSDK.PasswordResets.SendVerificationCode(passwordResetRequest)
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

	    OrderCloudSDK.PasswordResets.ResetPassword(verificationCode, passwordReset).
            then(function() {
                deferred.resolve();
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    function _logout(){
	    OrderCloudSDK.RemoveToken();
	    OrderCloudSDK.RemoveImpersonationToken();
	    Me.SetBuyerID(null);
        TokenRefresh.RemoveToken();
        $state.go(anonymous ? 'home' : 'login', {}, {reload: true});
    }

    // We are not using this base functionality. Only remember the user name.
    function _rememberMe(username) { }

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

function LoginController($stateParams, $exceptionHandler, $sce, $cookieStore, OrderCloudSDK, LoginService, WeirService, CurrentOrder, clientid, scope, Me, $q, $window, $state, ocRoles) {
    var vm = this;
    var username = null;
    LoginService.GetUsername()
        .then(function (myUsername) {
            console.log('My User Name: ' + myUsername);
            username = myUsername;
            vm.credentials = {
                Username: username,
                Password: null
            };
            vm.rememberStatus = username ? true : false;
        });

    vm.token = $stateParams.token;
    vm.form = vm.token ? 'reset' : 'login';
    vm.setForm = function (form) {
        vm.form = form;
    };
    var labels = {
        en: {
            LoginLabel: "Please enter your login details",
            ForgotLabel: "Enter your email, and we’ll send you instructions on how to reset your password",
            UsernameLabel: "Username",
            PasswordLabel: "Password",
            BackToLoginLabel: "Back to Login",
            ForgotPasswordLabel: "Forgot Password",
            ResetCodeLabel: "Reset Password with Verification Code",
            NewPasswordLabel: "New Password",
            RememberMe: "Remember Me",
            WorldWide: "Go to global website",
            ConfirmPasswordLabel: "Confirm Password",
            ResetPasswordMessage: "Your password has been reset.",
            ForgotMessageLabel: "Forgot Password email has been sent. Please check your email in order to reset your password.",
            ResetPasswordLabel: "Reset Password",
            SubmitLabel: $sce.trustAsHtml("Submit  <i class='icon-right-arrow'></i>"),
            BadUsernamePassword: "We are not able to recognise the email or password entered. Please check and re-enter.",
            ResetToastr: "Please reset your password",
            ResetMessage: "Due to a change in how we store password information, we must ask all registered users to reset their passwords. You can use the same password as before: ",
            VerificationCodeLabel: "Verification code"
        },
        fr: {
            LoginLabel: $sce.trustAsHtml("Veuillez saisir vos identifiants"),
            ForgotLabel: $sce.trustAsHtml("Veuillez renseigner votre email. Nous vous enverrons les instructions nécessaires afin de réinitialiser votre mot de passe."),
            UsernameLabel: $sce.trustAsHtml("Nom d'utilisateur"),
            PasswordLabel: $sce.trustAsHtml("Mot de passe"),
            BackToLoginLabel: $sce.trustAsHtml("Retourner &agrave; l'identification"),
            ForgotPasswordLabel: $sce.trustAsHtml("Mot de passe oubli&eacute;"),
            ResetCodeLabel: $sce.trustAsHtml("Réinitialiser le mot de passe avec le code de vérification."),
            RememberMe: $sce.trustAsHtml("Se souvenir de mes identifiants"),
            WorldWide: $sce.trustAsHtml("Acc&eacute;der au site global"),
            NewPasswordLabel: $sce.trustAsHtml("Nouveau mot de passe"),
            ConfirmPasswordLabel: $sce.trustAsHtml("Confirmer votre mot de passe"),
            ResetPasswordMessage: $sce.trustAsHtml("Votre mot de passe a été réinitialisé"),
            ForgotMessageLabel: $sce.trustAsHtml("Un e-mail a &eacute;t&eacute; envoy&eacute;. Veuillez regarder vos e-mails afin de changer votre mot de passe."),
            ResetPasswordLabel: $sce.trustAsHtml("Changer de mot de passe"),
            SubmitLabel: $sce.trustAsHtml("Soumettre  <i class='icon-right-arrow'></i>"),
            BadUsernamePassword: $sce.trustAsHtml("Nous ne reconnaissons pas cet e-mail ou ce mot de passe. Merci de vérifier vos identifiant, puis veuillez réessayer."),
            ResetToastr: $sce.trustAsHtml("Veuillez réinitialiser votre mot de passe"),
            ResetMessage: $sce.trustAsHtml("En raison d'une modification de la façon dont nous stockons les informations sur les mots de passe, nous demandons à tous les utilisateurs enregistrés de réinitialiser leurs mots de passe. Vous pouvez bien sûr réutiliser le même mot de passe que précédemment."),
            VerificationCodeLabel: $sce.trustAsHtml("Code de vérification")
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

    vm.submit = function () {
        //make into a seperate function?
        vm.loading = OrderCloudSDK.Auth.Login(vm.credentials.Username, vm.credentials.Password, clientid, scope)
            .then(function (data) {
                if (vm.rememberStatus) {
                    LoginService.SetUsername(vm.credentials.Username);
                } else {
                    LoginService.SetUsername(null);
                }
                OrderCloudSDK.SetToken(data.access_token);

                var roles = ocRoles.Set(data.access_token);
                if (roles.length === 1 && roles[0] === 'PasswordReset') {
                    vm.token = data.access_token;
                    vm.form = 'resetByToken';
                }

                return OrderCloudSDK.Buyers.List()
            })
            .then(function (buyers) {
                if (buyers && buyers.Items.length > 0) {
                    var buyer = buyers.Items[0];
                    Me.SetBuyerID(buyer.ID); //set the cookie in Me
                    CurrentOrder.Remove()
                        .then(function () {
                            return CurrentOrder.SetCurrentCustomer({id: buyer.ID, name: buyer.Name});
                        });
                    //WhoAmI = Me;
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
                }
            })
            //end seperate function for dry
            .then(function () {
                return WeirService.UserBuyers()
            })
            .then(function (buyers) {
                if (buyers.length > 0) {
                    //vm.setForm('chooseDivision');
                    $state.go('loginDivisions');
                } else {
                    LoginService.RouteAfterLogin();
                }
            })
            .catch(function (ex) {
                if (ex.status == 400 && ex.data) {
                    ex.data.error = vm.labels.BadUsernamePassword;
                }
                $exceptionHandler(ex);
            });
    };

    vm.resetPasswordByToken = function () {
        vm.loading = OrderCloudSDK.Me.ResetPasswordByToken({
            NewPassword: vm.credentials.NewPassword
        })
            .then(function () {
                vm.setForm('resetSuccess');
                vm.credentials = {
                    Username: null,
                    Password: null
                };
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    };

    vm.resetPasswordByCode = function () {
        var passwordReset = {
            clientid: clientid,
            username: vm.credentials.Username,
            password: vm.credentials.Password
        };

        vm.loading = OrderCloudSDK.PasswordResets.ResetPasswordByVerificationCode(vm.credentials.VerificationCode, passwordReset)
            .then(function () {
                vm.setForm('resetSuccess');
                vm.credentials = {
                    Username: null,
                    Password: null
                };
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    };

    vm.setCookie = function (lang) {
        var now = new Date();
        var exp = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
        $cookieStore.put('language', lang, {
            expires: exp
        });
        window.location.reload();
    };

    vm.forgotPassword = function () {
        LoginService.SendVerificationCode(vm.credentials.Email)
            .then(function () {
                vm.setForm('login');//verificationCodeSuccess
                vm.credentials.Email = null;
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
            });
    };

    vm.resetPassword = function () {
        LoginService.ResetPassword(vm.credentials, vm.token)
            .then(function () {
                vm.setForm('resetSuccess');
                vm.token = null;
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            })
            .catch(function (ex) {
                $exceptionHandler(ex);
                vm.credentials.ResetUsername = null;
                vm.credentials.NewPassword = null;
                vm.credentials.ConfirmPassword = null;
            });
    };




    vm.DivisionSelection = function (selectedDivision) {
        var dfd = $q.defer();
        WeirService.DivisionSelection(selectedDivision)
            .then(function () {
                //$window.location.reload();
                dfd.resolve();
            })
            .catch(function (err) {
                //what should be the error handling?
                console.log(err);

            });

        return dfd.promise;
    };
}

function NewPasswordController($uibModalInstance, $sce, WeirService) {
	var vm = this;

	vm.Login = function() {
		$uibModalInstance.close('login');
	};

	vm.New = function() {
		$uibModalInstance.close('forgot');
	};

	vm.Dismiss = function() {
		$uibModalInstance.dismiss();
	};

	var labels = {
		en: {
			Login: 'Go to log-in page',
			New: 'Get new password',
			Close: 'Close',
			Title: 'Security updates - New password required.',
			Message: $sce.trustAsHtml("We have made updates to the password encryption on this platform. All registered users will now require a new password to log-in<br><br>We have sent you a new temporary password via email.<br><br>Select Go to log-in page if you have your new password available, or<br><br>Select Get new password and we’ll email you a new temporary password.")
		},
		fr: {
			Login: $sce.trustAsHtml('Aller à la page de connexion'),
			New: $sce.trustAsHtml('Obtenir un nouveau Mot de Passe'),
			Close: $sce.trustAsHtml('Fermer'),
			Title: $sce.trustAsHtml('Mises à jour de sécurité - Un nouveau mot de passe est requis.'),
			Message: $sce.trustAsHtml("Nous avons mis à jour le cryptage du mot de passe sur notre plate-forme. Tous les utilisateurs enregistrés nécessitent désormais un nouveau mot de passe pour se connecter.<br><br>Nous vous avons envoyé un nouveau mot de passe temporaire par e-mail.<br><br>Sélectionnez Aller à la page de connexion si votre nouveau mot de passe est disponible, ou<br><br>Sélectionnez Obtenir un nouveau mot de passe pour recevoir un mot de passe temporaire.")
		}
	};

	vm.labels = labels[WeirService.Locale()];
}