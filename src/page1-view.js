(function(global){
	
	var PageOne = Backbone.View.extend({      //select sites window view
	
		el: '#page1',
		model: global.mainmodel,	
		events: {
		    "click .start-button":"start"
		},		
		initialize: function(){
		
		},
		start:function(){
			global.mainmodel.set('mainWindow','page2');
		}

	});
	
	global.PageOne = PageOne;

}(BX));







