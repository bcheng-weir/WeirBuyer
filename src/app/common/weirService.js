angular.module( 'orderCloud' )
    .factory( 'WeirService', WeirService )
;

function WeirService( $q, $cookieStore, OrderCloud, CurrentOrder ) {
    var service = {
        SerialNumber: serialNumber,
        SerialNumbers: serialNumbers,
        PartNumbers: partNumbers,
        AddPartToQuote: addPartToQuote,
        AddPartsToQuote: addPartsToQuote,
        QuickQuote: quickQuote,
	Locale: getLocale
    };

    function getLocale() {
        var localeOfUser = $cookieStore.get('language');
        if(localeOfUser == null || localeOfUser == false){
            //set the expiration date of the cookie.
            var now = new Date();
            var exp = new Date(now.getFullYear(), now.getMonth()+6, now.getDate());
            //getting the language of the user's browser
            localeOfUser = navigator.language;
            localeOfUser = localeOfUser.substr(0,2);
            //setting the cookie.
            $cookieStore.put('language', localeOfUser, {
                expires: exp
            });

        }
	    return localeOfUser;
    }

    function serialNumber(serialNumber) {
        var deferred = $q.defer();
        var result;

        OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.SN": serialNumber})
            .then(function(matches) {
		if (matches.Items.length == 1) {
                       	result = matches.Items[0];
                	getParts(result.ID);
		} else if (matches.Items.length == 0) {
			throw { message: "No matches found for serial number " + serialNumber};
		} else {
			throw { message: "Data error: Serial number " + serialNumber + " is not unique"};
		}
            })
            .catch(function(ex) {
               	deferred.reject(ex);
            });

        function getParts(catId) {
            OrderCloud.Me.ListProducts(null, 1, 100, null, null, null, catId)
                .then(function(products) {
                    result.Parts = [];
                    angular.forEach(products.Items, function(product) {
                        result.Parts.push({Number: product.ID, Detail: product});
                    });
                    deferred.resolve(result);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                })
        }
        return deferred.promise;
    }

    function serialNumbers(serialNumbers) {
        var deferred = $q.defer();

        var results = [];
        var queue = [];
        angular.forEach(serialNumbers, function(number) {
            if (number) {
            	queue.push((function() {
                	var d = $q.defer();
                	OrderCloud.Categories.List(null, 1, 50, null, null, {"xp.SN": number})
                    	.then(function(matches) {
				if (matches.Items.length == 1) {
                        		results.push({Number: number, Detail: matches.Items[0]});
				} else {
                                	results.push({Number: number, Detail: null});
				}
                        	d.resolve();
                    	})
                    	.catch(function(ex) {
                        	results.push({Number: number, Detail: null});
                        	d.resolve();
                    	});

                	return d.promise;
            	})());
	    }
        });

        $q.all(queue).then(function() {
            deferred.resolve(results);
        });
        return deferred.promise;
    }

    function partNumbers(partNumbers) {
        var deferred = $q.defer();

        var results = [];
        var queue = [];
        angular.forEach(partNumbers, function(number) {
            queue.push((function() {
                var d = $q.defer();

                OrderCloud.Me.GetProduct(number)
                    .then(function(product) {
                        results.push({Number: number, Detail: product});
                        d.resolve();
                    })
                    .catch(function(ex) {
                        results.push({Number: number, Detail: null});
                        d.resolve();
                    });

                return d.promise;
            })());
        });

        $q.all(queue).then(function() {
            deferred.resolve(results);
        });

        return deferred.promise;
    }

    function addPartToQuote(part) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItem(order);
            })
            .catch(function() {
                OrderCloud.Orders.Create({ID: randomQuoteID()})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItem(order);
                    })
            });

        function addLineItem(order) {
            var li = {
                ProductID: part.Detail.ID,
                Quantity: part.Quantity
            };

            OrderCloud.LineItems.Create(order.ID, li)
                .then(function(lineItem) {
                    deferred.resolve({Order: order, LineItem: lineItem});
                });
        }

        return deferred.promise;
    }

    function addPartsToQuote(parts) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItems(order);
            })
            .catch(function() {
                OrderCloud.Orders.Create({ID: randomQuoteID()})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function(part) {
                if (part.Quantity) {
                    queue.push((function() {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Detail.ID,
                            Quantity: part.Quantity
                        };

                        OrderCloud.LineItems.Create(order.ID, li)
                            .then(function(lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function quickQuote(parts) {
        var deferred = $q.defer();

        CurrentOrder.Get()
            .then(function(order) {
                addLineItems(order);
            })
            .catch(function() {
                OrderCloud.Orders.Create({ID: randomQuoteID()})
                    .then(function(order) {
                        CurrentOrder.Set(order.ID);
                        addLineItems(order);
                    });
            });

        function addLineItems(order) {
            var queue = [];

            angular.forEach(parts, function(part) {
                if (part.Number && part.Quantity) {
                    queue.push((function() {
                        var d = $q.defer();

                        var li = {
                            ProductID: part.Number,
                            Quantity: part.Quantity
                        };

                        OrderCloud.LineItems.Create(order.ID, li)
                            .then(function(lineItem) {
                                d.resolve(lineItem);
                            });

                        return d.promise;
                    })());
                }
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    function randomQuoteID() {
        var id = "";
        var possible = "0123456789";

        for( var i=0; i < 10; i++ )
            id += possible.charAt(Math.floor(Math.random() * possible.length));

        return id;
    }

    return service;
}
