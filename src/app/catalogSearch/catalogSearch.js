angular.module('orderCloud')
    .config (CatalogSearchConfig)
    .controller('CatalogSearchCtrl', CatalogSearchController)
    .directive('ordercloudCatalogSearch', ordercloudCatalogSearchDirective)
    .controller('CatalogSearchResultsCtrl', CatalogSearchResultsController)
;

function CatalogSearchConfig($stateProvider) {
    $stateProvider
        .state('catalogSearchResults', {
            parent: 'base',
            url: '/catalogsearchresults/:searchterm',
            templateUrl: 'catalogSearch/templates/catalogSearchResults.tpl.html',
            controller: 'CatalogSearchResultsCtrl',
            controllerAs: 'catalogSearchResults',
            resolve:{
                CategoryList: function($stateParams, OrderCloudSDK) {
                    return OrderCloudSDK.Me.ListCategories({'search':$stateParams.searchterm, 'depth':'all'});
                },
                ProductList: function($stateParams, OrderCloudSDK) {
                    return OrderCloudSDK.Me.ListProducts({'search':$stateParams.searchterm});
                }
            }
        })
    ;
}

function CatalogSearchResultsController(CategoryList, ProductList) {
    var vm = this;
    vm.products = ProductList;
    vm.categories = CategoryList;
}

function CatalogSearchController($scope, $state, $q, OrderCloudSDK) {
    var vm = this;
    vm.productData;
    vm.categoryData;
    vm.popupResults = function(term) {
        var maxProducts = $scope.maxprods || 5;
        var maxCategories = $scope.maxcats || 5;
        var dfd = $q.defer();
        var queue = [];
        queue.push(OrderCloudSDK.Me.ListProducts({ 'search':term, 'page':1, 'pageSize':maxProducts }));
        queue.push(OrderCloudSDK.Me.ListCategories({ 'search':term, 'page':1, 'pageSize':maxCategories, 'depth':'all' }));
        $q.all(queue)
            .then(function(responses) {
                vm.productData = responses[0].Items;
                vm.categoryData = responses[1].Items;
                angular.forEach(vm.productData, function(product) {
                    product.NameType = 'Product';
                });
                angular.forEach(vm.categoryData, function(category) {
                    category.NameType = 'Category';
                });
                var collected = vm.productData.concat(vm.categoryData);
                dfd.resolve(collected);
            });
        return dfd.promise;
    };

    vm.onSelect = function($item) {
        ($item.NameType === 'Category') ? $state.go('catalog.category', {categoryid: $item.ID}) : $state.go('catalog.product', {productid: $item.ID});
    };

    vm.onHardEnter = function(search) {
        $state.go('catalogSearchResults', {searchterm: search}, {reload: true});
    };
}

function ordercloudCatalogSearchDirective () {
    return {
        scope: {
            maxprods: '@',
            maxcats: '@'
        },
        restrict: 'E',
        templateUrl: 'catalogSearch/templates/catalogSearchDirective.tpl.html',
        controller: 'CatalogSearchCtrl',
        controllerAs: 'catalogSearch',
        replace: true
    }
}
