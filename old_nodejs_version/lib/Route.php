<?php

/**
 * I know regex would be more powerful, but I figured if you needed more complex matching, you could create more fallbacks
 * Not sure how or whether this should address GET vs POST
 */

class Route {
	protected $routes;
	protected $four;
	protected $path;

	public function __construct($routes, $four = null) {
		$this->routes = $routes;
		$this->four = $four;
	}
	/**
	 * This method is called recursively.
	 * It walks $path, traversing $routes alongside until one matches, or there are no more routes
	 */
	public function dispatch($path, $routes = array()) {
		// First run
		if (!$routes) {
			$this->path = $path;
			$routes = $this->routes;
		}

		$part = array_shift($path);

		if (array_key_exists($part, $routes)) {
			$route = $routes[ $part ];
		// numeric catch-all
		} elseif (array_key_exists('#', $routes) && is_numeric($part)) {
			$route = $routes['#'];
		// string catch-all
		} elseif (array_key_exists('"', $routes)) {
			$route = $routes['"'];
		/*
		// custom catch-all
		} elseif (array_key_exists(':num-alpha', $routes) && preg_match('/[0-9]+\-[a-z]+/i', $part)) {
			// Boom

		*/
		} else {
			// 404
			if ($this->four instanceof RouteTo) return $this->four->dispatch($path);
		}

		if (is_array($route)) { // more nesting to do
			return $this->dispatch($path, $route);
		} elseif ($route instanceof RouteTo) {
			// Run the controller
			return $route->dispatch($this->path);
		}
	}

	/**
	 * Use this within your routes data structure
	 */
	public static function To($class, $method) {
		return new RouteTo($class, $method);
	}
}
class RouteTo {
	protected $class;
	protected $method;
	public function __construct($class, $method) {
		$this->class = $class;
		$this->method = $method;
	}
	public function dispatch($path) {
		$class = $this->class;
		$method = $this->method;
		$c = new $class();
		return $c->$method($path);
	}
}

