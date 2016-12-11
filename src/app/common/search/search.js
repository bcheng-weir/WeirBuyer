angular.module('ordercloud-search', []);

angular.module('ordercloud-search')
    .directive('ordercloudSearch', OrdercloudSearch)
    .controller('ordercloudSearchCtrl', OrdercloudSearchController)
    .factory('TrackSearch', TrackSearchService )
    .factory('SearchProducts', SearchProductsService)
;

function OrdercloudSearch () {
    return {
        scope: {
            placeholder: '@',
            servicename: '@',
            controlleras: '='
        },
        restrict: 'E',
        templateUrl: 'common/search/templates/search.tpl.html',
        controller: 'ordercloudSearchCtrl',
        controllerAs: 'ocSearch',
        replace: true
    }
}

function OrdercloudSearchController($timeout, $scope, OrderCloud, TrackSearch) {
    $scope.searchTerm = null;
    if ($scope.servicename) {
        var var_name = $scope.servicename.replace(/([a-z])([A-Z])/g, '$1 $2');
        $scope.placeholder = "Search " + var_name + '...';
        var Service = OrderCloud[$scope.servicename];
    }
    var searching;
    $scope.$watch('searchTerm', function(n,o) {
        if (n == o) {
            if (searching) $timeout.cancel(searching);
        } else {
            if (searching) $timeout.cancel(searching);
            searching = $timeout(function() {
                n == '' ? n = null : angular.noop();
                TrackSearch.SetTerm(n);
                if($scope.servicename === 'Orders') {
                    if (!$scope.controlleras.searchfunction) {
                        Service.ListIncoming(null, null, n)
                            .then(function (data){
                                $scope.controlleras.list = data;
                            });
                    }
                    else {
                        $scope.controlleras.searchfunction($scope.searchTerm)
                            .then(function (data){
                                $scope.controlleras.list = data;
                            });
                    }
                }
                else if ($scope.servicename === 'SpendingAccounts') {
                    if (!$scope.controlleras.searchfunction) {
                        Service.List(n, null, null, null, null, {'RedemptionCode': '!*'})
                            .then(function (data){
                                $scope.controlleras.list = data;
                            });
                    }
                    else {
                        $scope.controlleras.searchfunction($scope.searchTerm)
                            .then(function (data){
                                $scope.controlleras.list = data;
                            });
                    }
                }
                else if ($scope.servicename === 'Shipments') {
                    if (!$scope.controlleras.searchfunction) {
                        Service.List(null, n, null, null)
                            .then(function (data) {
                                $scope.controlleras.list = data;
                            });
                    }
                    else {
                        $scope.controlleras.searchfunction($scope.searchTerm)
                            .then(function (data){
                                $scope.controlleras.list = data;
                            });
                    }
                }
                else {
                    if (!$scope.controlleras.searchfunction) {
                        Service.List(n)
                            .then(function (data){
                                $scope.controlleras.list = data;
                            });
                    }
                    else {
                        $scope.controlleras.searchfunction($scope.searchTerm)
                            .then(function (data){
                                $scope.controlleras.list = data;
                            });
                    }
                }

            }, 300);
        }
    });
}

function TrackSearchService() {
    var service = {
        SetTerm: _setTerm,
        GetTerm: _getTerm
    };

    var term = null;

    function _setTerm(value) {
        term = value;
    }

    function _getTerm() {
        return term;
    }

    return service;
}

function SearchProductsService(OrderCloud, Me, SearchTypeService) {
	//This service handles type ahead. for app/search and app/home.
    var service = {
        GetAllSerialNumbers: _getAllSerialNumbers,
        GetAllTagNumbers: _getAllTagNumbers,
        GetAllPartNumbers: _getAllPartNumbers,
	    GetPart: _getPart
    };
	var partResults = {};
    //First three are the home page search methods.
    function _getAllSerialNumbers(lookForThisPartialSerialNumber) {
    	var filter = {
    		"xp.SN":lookForThisPartialSerialNumber+"*"
	    };
	    if(Me.Org.xp.WeirGroup.id=="1") { // No global search for UK.
	    	filter.ParentID = Me.Org.ID;
	    }

    	return OrderCloud.Me.ListCategories(null, 1, 20, null, null, filter, Me.Org.xp.WeirGroup.id=="1" ? null : "all", Me.Org.xp.WeirGroup.label)
            .then(function(response) {
            	return response.Items;
            });
    }

    function _getAllTagNumbers(lookForThisPartialTagNumber) {
	    var filter = {
		    "xp.TagNumber":lookForThisPartialTagNumber+"*"
	    };
	    if(Me.Org.xp.WeirGroup.id=="1") { //No global search for UK
		    filter.ParentID = Me.Org.ID;
	    }

        return OrderCloud.Me.ListCategories(null, 1, 20, null, null, filter, Me.Org.xp.WeirGroup.id=="1" ? null : "all", Me.Org.xp.WeirGroup.label)
            .then(function(response) {
            	return response.Items;
            });
    }

    function _getAllPartNumbers(lookForThisPartialPartNumber) {
        return OrderCloud.Me.ListProducts(null, 1, 20, null, null, {"Name": lookForThisPartialPartNumber+"*"})
            .then(function(response) {
	            if(Me.Org.xp.WeirGroup.label == "WVCUK") {
		            partResults = response.Items;
		            return OrderCloud.Me.ListProducts(null, 1, 20, null, null, {"xp.AlternatePartNumber":lookForThisPartialPartNumber+"*"})
			            .then(function(altResponse) {
				            partResults.push.apply(altResponse.Items);
				            return partResults;
			            });
	            } else {
	            	response.Items;
	            }
            });
    }

    //This method is used in the main search that is NOT the home page.
	function _getPart(lookForThisProduct, forThisCustomer) {
		var filter = {
			"s":{
				"xp.SN":lookForThisProduct+"*"
			},
			"t":{
				"xp.TagNumber":lookForThisProduct+"*"
			},
			"p":{
				"WPIFR":{
					"primary": {
						"Name":lookForThisProduct+"*"
					}
				},
				"WVCUK":{
					"primary":{
						"Name":lookForThisProduct+"*"
					},
					"secondary":{
						"xp.AlternatePartNumber":lookForThisProduct+"*"
					}
				}
			}
		};

		//If a UK user, OR not a global search, and not a part search: set a ParentID filter
		if(SearchTypeService.GetLastSearchType() != "p" && (Me.Org.xp.WeirGroup.id=="1" || !SearchTypeService.IsGlobalSearch())) {
			filter[SearchTypeService.GetLastSearchType()].ParentID = forThisCustomer.id;
		}

		if(SearchTypeService.GetLastSearchType() == "p") {
			return OrderCloud.Me.ListProducts(null, 1, 20, null, null, filter[SearchTypeService.GetLastSearchType()][Me.Org.xp.WeirGroup.label].primary)
				.then(function(response) {
					if(Me.Org.xp.WeirGroup.label == "WVCUK") {
						partResults = response.Items;
						return OrderCloud.Me.ListProducts(null, 1, 20, null, null, filter[SearchTypeService.GetLastSearchType()][Me.Org.xp.WeirGroup.label].secondary)
							.then(function(altResponse) {
								partResults.push.apply(altResponse.Items);
								return partResults;
							});
					} else {
						return response.Items;
					}
				});
		} else {
			return OrderCloud.Me.ListCategories(null, 1, 20, null, null, filter[SearchTypeService.GetLastSearchType()], SearchTypeService.IsGlobalSearch() ? Me.Org.xp.WeirGroup.id=="1" ? null : "all" : null, Me.Org.xp.WeirGroup.label)
				.then(function (response) {
					return response.Items;
				});
		}
	}

    return service;
}