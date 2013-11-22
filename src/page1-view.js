(function(global){
	/*
	start page
	*/
	var PageOne = Backbone.View.extend({  
	
		el: '#page1',
		model: global.mainmodel,	
		events: {
		    "click .start-button":"start"  //start button
		},		
		initialize: function(){
		
		},
		start:function(){			//go to page2
			global.mainmodel.set('mainWindow','page2');
		}

	});
	
	global.PageOne = PageOne;

}(BX));








