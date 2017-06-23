var app = angular.module('myApp', ['ui.router', 'ngToast', 'textAngular']); //injecting dependencies!

app.run(function($rootScope, AuthService, $state, $transitions) {
    //$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
    //    if(toState.authenticate == true)
    //    {
    //        AuthService.isAuthenticated()
    //        .then(function(res) {
    //            console.log(res);
    //            if(res == false)
    //            {
    //                $state.go('login');
    //            }
    //        });
    //    }
    //})

    $transitions.onStart({}, function(transition) {
        if (transition.$to().self.authenticate == true) {
            AuthService.isAuthenticated()
                .then(function(res) {
                    console.log(res);
                    if (res == false) {
                        $state.go('login');
                    }
                });
        }
    })
});

// custom services

app.factory('AuthService', function($q, $rootScope) {
    return {
        isAuthenticated: function() {
            var defer = $q.defer();

            Stamplay.User.currentUser(function(err, res) {
                if (err) {
                    defer.resolve(false);
                    $rootScope.loggedIn = false;
                }
                if (res.user) {
                    defer.resolve(true);
                    $rootScope.loggedIn = true;
                }
                else {
                    defer.resolve(false);
                    $rootScope.loggedIn = false;
                }
            });

            return defer.promise;
        }
    }
})

app.config(function($stateProvider, $locationProvider, $urlRouterProvider) {
    $locationProvider.hashPrefix('');
    Stamplay.init("rawshn2");

    localStorage.removeItem('https://blogit-rawshn.c9users.io-jwt')

    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'templates/home.html',
            controller: "HomeCtrl"
        })
        .state('login', {
            url: '/login',
            templateUrl: 'templates/login.html',
            controller: "LoginCtrl"
        })
        .state('signup', {
            url: '/signup',
            templateUrl: 'templates/signup.html',
            controller: "SignUpCtrl"
        })
        .state('MyBlogs', {
            url: '/myBlogs',
            templateUrl: 'templates/myBlogs.html',
            controller: 'MyBlogsCtrl',
            authenticate: true
        })
        .state('Create', {
            url: 'create',
            templateUrl: 'templates/create.html',
            controller: 'CreateCtrl',
            authenticate: true
        })
        .state('Edit', {
            url: '/edit/:id',
            templateUrl: 'templates/edit.html',
            controller: 'EditCtrl',
            authenticate: true
        })
        .state('View', {
            url: '/view/:id',
            templateUrl: 'templates/view.html',
            controller: 'ViewCtrl'
        });

    $urlRouterProvider.otherwise("/");
});

app.filter('htmlToPlainText', function() {
    return function(text) {
        return text ? String(text).replace(/<[^>]+>/gm, '') : '';
    }
})

app.controller('ViewCtrl', function(taOptions, $state, $stateParams, $scope, $timeout, ngToast) {
    $scope.upVoteCount = 10;
    $scope.downVoteCount = 5;

    Stamplay.Object("blogs").get({
            _id: $stateParams.id
        })
        .then(function(response) {
            $scope.blog = response.data[0];
            $scope.upVoteCount = $scope.blog.actions.votes.users_upvote.length;
            $scope.downVoteCount = $scope.blog.actions.votes.users_downvote.length;

            $scope.blog.actions.comments.forEach(function(element, index) {
                Stamplay.User.get({
                        "_id": element.userId
                    })
                    .then(function(r) {
                        $scope.blog.actions.comments[index].displayName = r.data[0].firstName + " " + r.data[0].lastName;
                        $scope.$apply();
                    })
            });

            console.log($scope.blog)

        }, function(error) {
            console.log(error);
        })

    $scope.postComment = function() {
        Stamplay.Object("blogs").comment($stateParams.id, $scope.comment)
            .then(function(res) {
                console.log(res);
                $scope.blog = res;

                $scope.blog.actions.comments.forEach(function(element, index) {
                    Stamplay.User.get({
                            "_id": element.userId
                        })
                        .then(function(r) {
                            $scope.blog.actions.comments[index].displayName = r.data[0].firstName + " " + r.data[0].lastName;
                            $scope.$apply();
                        })
                });

                $scope.comment = "";
                $scope.$apply();
            }, function(err) {
                console.log(err);
                if (err.code == 403) {
                    console.log("Login First!");
                    $timeout(function() {
                        ngToast.create('<a href="#/login" class="">Please login before posting comments!.</a>');
                    });
                }
            })
    }

    $scope.upVote = function() {
        Stamplay.Object("blogs").upVote($stateParams.id)
            .then(function(res) {
                console.log(res);
                $scope.blog = res;
                $scope.comment = "";
                $scope.upVoteCount = $scope.blog.actions.votes.users_upvote.length;
                $scope.$apply();
            }, function(err) {
                console.log(err);
                if (err.code == 403) {
                    console.log("Logim First!");
                    $timeout(function() {
                        ngToast.create('<a href="#/login" class="">Please Login Before Voting!</a>');
                    });
                }
                if (err.code == 406) {
                    console.log("Already Voted!");
                    $timeout(function() {
                        ngToast.create('You have already voted on this Post!');
                    });
                }
            })
    }

    $scope.downVote = function() {
        Stamplay.Object("blogs").downVote($stateParams.id)
            .then(function(res) {
                console.log(res);
                $scope.blog = res;
                $scope.comment = "";
                $scope.upVoteCount = $scope.blog.actions.votes.users_upvote.length;
                $scope.downVoteCount = $scope.blog.actions.votes.users_downvote.length;
                $scope.$apply();
            }, function(err) {
                console.log(err);
                if (err.code == 403) {
                    console.log("Logim First!");
                    $timeout(function() {
                        ngToast.create('<a href="#/login" class="">Please Login Before Voting!</a>');
                    });
                }
                if (err.code == 406) {
                    console.log("Already Voted!");
                    $timeout(function() {
                        ngToast.create('You have already voted on this Post!');
                    });
                }
            })
    }

});

app.controller('EditCtrl', function(taOptions, $state, $stateParams, $scope, $timeout, ngToast) {

    $scope.Post = {};

    taOptions.toolbar = [
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'quote'],
        ['bold', 'italics', 'underline', 'strikeThrough', 'ul', 'ol', 'redo', 'undo', 'clear'],
        ['justifyLeft', 'justifyCenter', 'justifyRight', 'indent', 'outdent'],
        ['html', 'insertImage', 'insertLink', 'wordcount', 'charcount']
    ];

    Stamplay.Object("blogs").get({
            _id: $stateParams.id
        })
        .then(function(res) {
            console.log(res);
            $scope.Post = res.data[0];
            $scope.$apply();
            console.log($scope.Post);
        }, function(err) {
            console.log(err);
        });

    $scope.update = function() {
        Stamplay.User.currentUser().then(function(res) {

            if (res.user) {
                if (res.user._id == $scope.Post.owner) {
                    Stamplay.Object("blogs").update($stateParams.id, $scope.Post)
                        .then(function(response) {
                            console.log(response);
                            $state.go("MyBlogs");
                        }, function(error) {
                            console.log(error);
                        });
                }
                else
                    $state.go("login");
            }
            else
                $state.go("login");
        }, function(err) {
            console.log(err);
        });
    }
});

app.controller('CreateCtrl', function(taOptions) {

    $scope.newPost = {};

    taOptions.toolbar = [
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'quote'],
        ['bold', 'italics', 'underline', 'strikeThrough', 'ul', 'ol', 'redo', 'undo', 'clear'],
        ['justifyLeft', 'justifyCenter', 'justifyRight', 'indent', 'outdent'],
        ['html', 'insertImage', 'insertLink', 'wordcount', 'charcount']
    ];

    $scope.create = function() {
        Stamplay.User.currentUser()
            .then(function(res) {
                if (res.user) {
                    // proceed with creation of post
                    Stamplay.Object("blogs").save($scope.newPost)
                        .then(function(res) {
                            ngToast.create("Post Successfully Created!");
                        });
                    $state.go('MyBlogs');
                }
                else {
                    $state.go('login');
                }
            }, function(err) {
                $timeout(function() {
                    ng.Toast.create("an error has occured. Please try again later.");
                });
                console.log(err);
            })
    }
});


app.controller('MyBlogCtrl', function($scope, $state) {
    Stamplay.User.currentUser().then(function(res) {
        if (res.user) {
            Stamplay.Object("blogs").get({
                    owner: res.user._id,
                    sort: "-dt_create"
                })
                .then(function(response) {
                    console.log(response);
                    $scope.userBlogs = response.data;
                    $scope.$apply();
                    console.log($scope.userBlogs);
                }, function(err) {
                    console.log(err);
                });
        }
        else {
            $state.go('login');
        }
    }, function(err) {
        console.log(err);
    });
});

app.controller('SignUpCtrl', function($scope, ngToast, $timeout) {
    $scope.newUser = {};
    $scope.signup = function() {
        $scope.newUser.displayName = $scope.newUser.firstName + " " + $scope.newUser.lastName;
        if ($scope.newUser.firstName && $scope.newUser.lastName && $scope.newUser.email && $scope.newUser.confirmPassword) {
            console.log("All fields are Valid!");

            if ($scope.newUser.password == $scope.newUser.confirmPassword) {
                console.log("All Good! Let's Sign Up");
                Stamplay.User.signup($scope.newUser)
                    .then(function(response) {
                        $timeout(function() {
                            ngToast.create("Your account has been created pleasse Login!");
                        });
                        console.log(response);
                    }, function(error) {
                        $timeout(function() {
                            ngToast.create("An Error has occoured please try try again!");
                        });
                        console.log(error);
                    });
            }
            else {
                $timeout(function() {
                    ngToast.create("An Error has occoured please try try again!");
                });
                console.log("Password do not match");
            }

        }
        else {
            $timeout(function() {
                ngToast.create("An Error has occoured please try try again!");
            });
            console.log("Some fields are invalid!");
        }
    }
});

app.controller('HomeCtrl', function($scope, $http) {
    Stamplay.Object("blogs").get({
            sort: "-dt_create"
        })
        .then(function(res) {
            console.log(res);
            $scope.latestBlogs = res.data;
            $scope.$apply();
            console.log($scope.latestBlogs);
        }, function(err) {
            console.log(err);
        });
});

app.controller('LoginCtrl', function($scope, $state, $timeout, $rootScope, ngToast) {
    $scope.login = function() {
        Stamplay.User.currentUser()
            .then(function(res) {
                console.log(res);
                if (res.user) {
                    $rootScope.loggedIn = true;
                    $rootScope.displayName = res.user.firstName + " " + res.user.lastName;
                    //user already logged in
                    $timeout(function() {
                        $state.go('MyBlogs');
                    });
                }
                else {
                    //proceed with login
                    Stamplay.User.login($scope.user)
                        .then(function(res) {
                            $timeout(function() {
                                ngToast.create("Login Successful!");
                            });
                            console.log(res);
                            $rootScope.loggedIn = true;
                            $rootScope.displayName = res.firstName + " " + res.lastName;
                            $timeout(function() {
                                $state.go("MyBlogs");
                            });
                        }, function(err) {
                            console.log(err);
                            $timeout(function() {
                                ngToast.create("Login Failed!");
                            });
                            $rootScope.loggedIn = false;
                        })
                }
            }, function(error) {
                $timeout(function() {
                    ngToast.create("An Error has occoured please try try again!");
                });
                console.log(error);
            });
    }
});

app.controller('MainCtrl', function($scope, $rootScope, $timeout) {
    $scope.logout = function() {
        console.log("LogOut Called")
        Stamplay.User.logout(true, function() {

            console.log("Logged Out!");

            $timeout(function() {
                $rootScope.loggedIn = false;
            })

        });
    }
});