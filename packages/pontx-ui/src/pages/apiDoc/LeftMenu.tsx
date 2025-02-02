/**
 * @author jasonHzq
 * @description LeftMenu
 *
 * 菜单组件： https://fusion.design/pc/component/menu?themeid=2
 */
import * as React from "react";
import "./LeftMenu.less";
import * as PontSpec from "pontx-spec";
import { Select, Input, Menu, Message, Balloon } from "@alicloud/console-components";
import _ from "lodash";
import { LayoutContext } from "../../layout/context";
import { filterSpec } from "../../components/utils/utils";

export class LeftMenuProps {}

export const LeftMenu: React.FC<LeftMenuProps> = (props) => {
  const { selectedMeta, currSpec, changeCurrSpec, changeSelectedMeta, specs } = LayoutContext.useContainer();

  const [inputValue, changeInputValue] = React.useState("");
  const [searchValue, _changeSearchValue] = React.useState("");
  const changeSearchValue = React.useCallback((val: any) => {
    return _.debounce(_changeSearchValue)(val);
  }, []);
  const filteredCurrSpec = filterSpec(currSpec, searchValue);

  // 中英搜索
  const searchArea = (
    <div className="search-area">
      <Input
        value={inputValue}
        placeholder="search"
        onChange={(value) => {
          changeInputValue(value);
          changeSearchValue(value);
        }}
      />
    </div>
  );

  // 简单、复杂模式切换、搜索、折叠
  const menus = (
    <Menu selectedKeys={[selectedMeta?.name]} defaultOpenKeys={[filteredCurrSpec?.[0]?.name]} mode="inline">
      {(filteredCurrSpec?.mods || []).map((mod) => {
        return (
          <Menu.SubMenu
            key={mod.name as any}
            label={
              <div className="mod-name">
                <div className="name" title={mod.name as any}>
                  {mod.name}({mod.interfaces?.length || 0})
                </div>
                <div className="desc" title={mod.description}>
                  {mod.description}
                </div>
              </div>
            }
          >
            {mod.interfaces.map((api) => {
              return (
                <Menu.Item
                  className={selectedMeta?.type === "api" && api.name === selectedMeta?.name ? "selected" : ""}
                  key={api.name}
                  id={api.name}
                  onClick={() =>
                    changeSelectedMeta({
                      type: "api",
                      modName: mod.name as any,
                      name: api.name,
                      spec: api,
                    })
                  }
                >
                  <div className="api-name">
                    <div className="name" title={api.name}>
                      {api.name}
                    </div>
                    <div className="desc" title={api.description}>
                      {api.description}
                    </div>
                  </div>
                </Menu.Item>
              );
            })}
          </Menu.SubMenu>
        );
      })}

      {PontSpec.PontSpec.getClazzCnt(filteredCurrSpec) ? (
        <Menu.SubMenu
          key="pontx-classes"
          label={<span>数据结构({PontSpec.PontSpec.getClazzCnt(filteredCurrSpec)})</span>}
        >
          {_.map(filteredCurrSpec?.definitions || {}, (clazz, name) => {
            return (
              <Menu.Item
                className={name === selectedMeta?.name ? "selected" : ""}
                key={name}
                id={name}
                onClick={() =>
                  changeSelectedMeta({
                    type: "baseClass",
                    name,
                    spec: clazz,
                  })
                }
              >
                <div className="api-name">
                  <div className="name" title={name}>
                    {name}
                  </div>

                  <div className="desc" title={clazz.schema?.description || clazz?.schema?.title}>
                    {clazz.schema?.description || clazz?.schema?.title}
                  </div>
                </div>
              </Menu.Item>
            );
          })}
        </Menu.SubMenu>
      ) : null}
    </Menu>
  );
  return (
    <div className="pontx-ui-left-menu">
      {searchArea}
      {!PontSpec.PontSpec.getMods(filteredCurrSpec)?.length && !PontSpec.PontSpec.getClazzCnt(filteredCurrSpec) ? (
        <Message type="notice"></Message>
      ) : (
        menus
      )}
    </div>
  );
};

LeftMenu.defaultProps = new LeftMenuProps();
