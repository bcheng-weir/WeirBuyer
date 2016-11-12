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

function LoginService($q, $window, $state, toastr, OrderCloud, TokenRefresh, clientid, buyerid, anonymous) {
    return {
        SendVerificationCode: _sendVerificationCode,
        ResetPassword: _resetPassword,
        RememberMe: _rememberMe,
        Logout: _logout
    };

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

    function _rememberMe() {
        TokenRefresh.GetToken()
            .then(function (refreshToken) {
                if (refreshToken) {
                    TokenRefresh.Refresh(refreshToken)
                        .then(function(token) {
                            OrderCloud.Auth.SetToken(token.access_token);
                            OrderCloud.Buyers.List().then(function (buyers) {
                                if (buyers && buyers.Items.length > 0) {
                                    var buyer = buyers.Items[0];
                                    OrderCloud.BuyerID.Set(buyer.ID);
                                    $state.go('home');
                                }
                            });
                        })
                        .catch(function () {
                            toastr.error('Your token has expired, please log in again.');
                        });
                } else {
                    _logout();
                }
            });
    }
}

function LoginController($state, $stateParams, $exceptionHandler, $cookieStore, OrderCloud, LoginService, WeirService, TokenRefresh, buyerid) {
    var vm = this;
    vm.credentials = {
        Username: null,
        Password: null
    };
    vm.token = $stateParams.token;
    vm.form = vm.token ? 'reset' : 'login';
    vm.setForm = function(form) {
        vm.form = form;
    };
    vm.rememberStatus = false;
    var labels = {
        en: {
            LoginLabel: "Login",
            UsernameLabel: "Username",
            PasswordLabel: "Password",
            BackToLoginLabel: "Back to Login",
            ForgotPasswordLabel: "Forgot Password",
            NewPasswordLabel: "New Password",
            ConfirmPasswordLabel: "Confirm Password",
            ResetPasswordMessage: "Your password has been reset.",
            ForgotMessageLabel: "Forgot Password email has been sent. Please check your email in order to reset your password.",
            ResetPasswordLabel: "Reset Password",
            SubmitLabel: "Submit",
            BadUsernamePassword: "We are not able to recognise the email or password entered. Please check and re-enter."
        },
        fr: {
            LoginLabel: "S'identifier",
            UsernameLabel: "Nom d'utilisateur",
            PasswordLabel: "Mot de passe",
            BackToLoginLabel: "Retourner &agrave; l'identification",
            ForgotPasswordLabel: "Mot de passe oubli&eacute;",
            NewPasswordLabel: "Nouveau mot de passe",
            ConfirmPasswordLabel: "Confirmer votre mot de passe",
            ResetPasswordMessage: "Votre mot de passe a &eacute;t&eacute; chang&eacute;",
            ForgotMessageLabel: "Un e-mail a &eacute;t&eacute; envoy&eacute;. Veuillez regarder vos e-mails afin de changer votre mot de passe.",
            ResetPasswordLabel: "Changer de mot de passe",
            SubmitLabel: "Soumettre",
            BadUsernamePassword: "Nous ne reconnaissons pas cet e-mail ou ce mot de passe. Merci de v&eacute;rifier vos identifiant, puis veuillez r&eacute;essayer."
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
    vm.submit = function() {
        OrderCloud.Auth.GetToken(vm.credentials)
            .then(function(data) {
                vm.rememberStatus ? TokenRefresh.SetToken(data['refresh_token']) : angular.noop();
                OrderCloud.Auth.SetToken(data['access_token']);
                OrderCloud.Buyers.List().then(function (buyers) {
                    if (buyers && buyers.Items.length > 0) {
                        var buyer = buyers.Items[0];
                        OrderCloud.BuyerID.Set(buyer.ID);
                        $state.go('home');
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
