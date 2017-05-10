angular.module('orderCloud')
	.config(AccountConfig)
	.controller('AccountCtrl', AccountController)
	.factory('AccountService', AccountService)
	.controller('ConfirmPasswordCtrl', ConfirmPasswordController)
	.controller('ChangePasswordCtrl', ChangePasswordController)
;

function AccountConfig($stateProvider) {
	$stateProvider
		.state('account', {
			parent: 'base',
			url: '/account',
			templateUrl: 'account/templates/account.tpl.html',
			controller: 'AccountCtrl',
			controllerAs: 'account'
		})
		.state('account.changePassword', {
			url: '/changepassword',
			templateUrl: 'account/templates/changePassword.tpl.html',
			controller: 'ChangePasswordCtrl',
			controllerAs: 'changePassword'
		})
	;
}

function AccountService($q, $uibModal, OrderCloudSDK, clientid, scope) {
	var service = {
		Update: _update,
		ChangePassword: _changePassword
	};

	function _update(currentProfile, newProfile) {
		var deferred = $q.defer();

		function updateUser() {
			OrderCloudSDK.Me.Update(newProfile)
				.then(function(data) {
					deferred.resolve(data);
				})
				.catch(function(ex) {
					deferred.reject(ex);
				});
		}

		$uibModal.open({
			animation: true,
			templateUrl: 'account/templates/confirmPassword.modal.tpl.html',
			controller: 'ConfirmPasswordCtrl',
			controllerAs: 'confirmPassword',
			size: 'sm'
		}).result.then(function(password) {
			var checkPasswordCredentials = {
				Username: currentProfile.Username,
				Password: password
			};
			OrderCloudSDK.GetToken(checkPasswordCredentials)
				.then(function() {
					updateUser();
				})
				.catch(function(ex) {
					deferred.reject(ex);
				});
		}, function() {
			angular.noop();
		});

		return deferred.promise;
	}

	function _changePassword(currentUser) {
		var deferred = $q.defer();

		var checkPasswordCredentials = {
			Username: currentUser.Username,
			Password: currentUser.CurrentPassword
		};

		return OrderCloudSDK.Auth.Login(checkPasswordCredentials.Username, checkPasswordCredentials.Password, clientid, scope)
			.then(function () {
				return OrderCloudSDK.Me.ResetPasswordByToken({
					NewPassword: currentUser.NewPassword
				})
				.then(function() {
					deferred.resolve();
				});
			})
			.catch(function (ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	return service;
}

function AccountController($exceptionHandler, $state, toastr, AccountService, CurrentUser, WeirService, $sce, Me) {
	var vm = this;
	vm.profile = angular.copy(CurrentUser);
	var currentProfile = CurrentUser;
    var labels = {
        en: {
            Account: "Account",
            FirstName: "First Name",
            LastName: "Last Name",
            UserID: "User ID",
            Username: "Username",
            Email: "Email",
            Phone: "Phone",
            SaveChanges: "Save Changes",
            RevertChanges: "Revert Changes",
            ChangePassword: "Change Password",
            Addresses: "Addresses",
            AccountChanges: "Account changes were saved.",
            Success: "Success"
        },
        fr: {
            Account: $sce.trustAsHtml("Compte"),
            FirstName: $sce.trustAsHtml("Pr&eacute;nom"),
            LastName: $sce.trustAsHtml("Nom"),
            UserID: $sce.trustAsHtml("Identifiant d'utilisateur"),
            Username: $sce.trustAsHtml("Nom d'utilisateur"),
            Email: $sce.trustAsHtml("Email"),
            Phone: $sce.trustAsHtml("T&eacute;l&eacute;phone"),
            SaveChanges: $sce.trustAsHtml("Sauvegarder les modifications"),
            RevertChanges: $sce.trustAsHtml("R&eacute;tablir les modifications"),
            ChangePassword: $sce.trustAsHtml("Changer le mot de passe"),
            Addresses: $sce.trustAsHtml("Adresses"),
            AccountChanges: $sce.trustAsHtml("Les modifications de compte ont été enregistrées"),
            Success: $sce.trustAsHtml("Succès")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);

	vm.update = function() {
		AccountService.Update(currentProfile, vm.profile)
			.then(function(data) {
				vm.profile = angular.copy(data);
				currentProfile = data;
				toastr.success(vm.labels.AccountChanges , vm.labels.Success);
			})
			.catch(function(ex) {
				vm.profile = currentProfile;
				$exceptionHandler(ex)
			});
	};

	vm.resetForm = function(form) {
		vm.profile = currentProfile;
		form.$setPristine(true);
	};
	vm.editAddresses = function () {
	    $state.go('customers.edit', { buyerid: Me.GetBuyerID() });
	};

}

function ConfirmPasswordController($uibModalInstance, $sce, WeirService) {
	var vm = this;

	vm.submit = function() {
		$uibModalInstance.close(vm.password);
	};

	vm.cancel = function() {
		$uibModalInstance.dismiss('cancel');
	};

	var labels = {
	    en: {
	        PasswordConfirmPrompt: "Please confirm your password",
	        Submit: "Submit",
            Cancel: "Cancel"
	    },
	    fr: {
	        ChangePassword: $sce.trustAsHtml("Changer le mot de passe"),
            PasswordConfirmPrompt: $sce.trustAsHtml("Veuillez confirmer votre mot de passe"),
	        Submit: $sce.trustAsHtml("Soumettre"),
	        Cancel: $sce.trustAsHtml("Annuler")
	}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function ChangePasswordController($state, $exceptionHandler, toastr, AccountService, CurrentUser, $sce, WeirService) {
	var vm = this;
	vm.currentUser = CurrentUser;
    var labels = {
        en: {
            ChangePwdHeader: "Change Password",
            CurrentPwd: "Current Password",
            Confirm: "Confirm Password",
            NewPwd: "New Password",
            Submit: "Submit",
            BackToAcct: "Back to Account",
			PasswordChange: "Password successfully changed",
			Succes: "Success"
        },
        fr: {
            ChangePwdHeader: $sce.trustAsHtml("Changer le mot de passe"),
            CurrentPwd: $sce.trustAsHtml("Mot de passe actuel"),
            NewPwd: $sce.trustAsHtml("Nouveau mot de passe"),
            Confirm: $sce.trustAsHtml("Confirmer votre mot de passe"),
            Submit: $sce.trustAsHtml("Soumettre"),
            BackToAcct: $sce.trustAsHtml("Retour au compte"),
            PasswordChange: "Mot de passe changé avec succès",
            Succes: "Succès"
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
	vm.changePassword = function() {
		AccountService.ChangePassword(vm.currentUser)
			.then(function() {
				toastr.success( vm.labels.PasswordChange, vm.labels.Succes);
				vm.currentUser.CurrentPassword = null;
				vm.currentUser.NewPassword = null;
				vm.currentUser.ConfirmPassword = null;
				$state.go('account');
			})
			.catch(function(ex) {
				$exceptionHandler(ex);
			});
	};

}
