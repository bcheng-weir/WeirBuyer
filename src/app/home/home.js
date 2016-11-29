angular.module('orderCloud')
	.config(HomeConfig)
	.controller('HomeCtrl', HomeController)
;

function HomeConfig($stateProvider, $sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist([
		'self',
		'https://www.global.weir/brands/**'
	]);
	$stateProvider
		.state('home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home',
            resolve: {
                Language: function(OrderCloud, $cookieStore, WeirService) {
                    var cust = OrderCloud.BuyerID.Get();
                    if(!cust) return;
                    OrderCloud.Buyers.Get(cust).then(function (buyer) {
                        var lang = WeirService.Locale();
                        //set the expiration date of the cookie.
                        var now = new Date();
                        var exp = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
                        if (buyer.xp.WeirGroup.id == 2 && lang == 'en') {
                            //make it fr
                            $cookieStore.put('language', 'fr', {
                                expires: exp
                            });

                        }
                        if (buyer.xp.WeirGroup.id == 1 && lang == 'fr') {
                            //make it en
                            $cookieStore.put('language', 'en', {
                                expires: exp
                            });

                        }
                    });
                }
            }
		})
}

function HomeController($sce, $state, $rootScope, WeirService, $cookieStore, OrderCloud) {
    var vm = this;

}