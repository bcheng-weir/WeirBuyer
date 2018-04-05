angular.module('orderCloud')
    .service('FxRate',FxRate);

function FxRate($q, OrderCloudSDK) {
    //TODO make a generic function service or add todate(), and the tonum() in the admin app, to WeirService.
    function todate(num) {
        if (num) {
            var year = num / 10000;
            var month = (num / 100) % 100 - 1;
            var day = (num % 100);
            return new Date(year, month, day);
        }
        return null;
    }

    var service = {
        GetFxSpec: getFxSpec,
        SetFxSpec: setFxSpec,
        SetCurrentFxRate: setCurrentFxRate,
        GetCurrentFxRate: getCurrentFxRate
    };

    var FXSpec = {};
    var FXRate = {};

    //Set the Entire Spec Record. This occurs on base.js resolve.
    function setFxSpec(Buyer) {
        var deferred = $q.defer();
        var specID;
        if(Buyer.xp.WeirGroup.label === "WPIFR" && Buyer.xp.Curr) {
            specID = "WPIFR-EUR-" + Buyer.xp.Curr;
        } else if (Buyer.xp.WeirGroup.label === "WVCUK" && Buyer.xp.Curr) {
            specID = "WVCUK-GBP-" + Buyer.xp.Curr;
        }

        if(specID) {
            OrderCloudSDK.Specs.Get(specID)
                .then(function(fxspec) {
                    FXSpec = fxspec;
                    deferred.resolve(FXSpec);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                })
        } else {
            deferred.resolve(FXSpec);
        }

        return deferred.promise;
    }

    //Unlikely to use this in the buyer app.
    function getFxSpec() {
        return FXSpec;
    }

    // Use this before getting the fxRate. Base might as well set it then myquote and enquiry can do the below get().
    function setCurrentFxRate(Buyer) {
        var today = new Date();
        var Today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var tmp = [];
        var patch = {};
        var current = -1;
        var future = -1;
        if (FXSpec && FXSpec.xp && FXSpec.xp.rates) {
            var tmp = FXSpec.xp.rates;
            for (var i = 0; i < tmp.length && (future < 0 || current < 0); i++) {
                var rte = tmp[i];
                var start = todate(rte.Start);
                var end = todate(rte.End);
                if (end === null) {
                    //future = i;
                    end = Today;
                }
                if (start <= Today && end >= Today) {
                    current = i;
                }
            }
        }

        if(current > -1) {
            FXRate.ConvertTo = Buyer.xp.Curr;
            FXRate.Rate = FXSpec.xp.rates[current].Rate;
        } else {
            FXRate = null;
        }
    }

    function getCurrentFxRate() {
        return FXRate;
    }

    return service;
}